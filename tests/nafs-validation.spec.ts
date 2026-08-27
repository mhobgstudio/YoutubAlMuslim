import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 36 nafs URLs extracted from topics.json
const NAFS_URLS = [
  { id: '-qubS86GQSo', title: 'The Reality of Jinn in Islam' },
  { id: '04KdFu9QSiM', title: 'Your First Night In The Grave' },
  { id: '0reCmOZBRZE', title: 'Mini Seerah - Introduction to Prophet Mohammed' },
  { id: '0z-Ru6ewrkg', title: 'The Descent of Isa (عليه السلام) | The Signs Of The Hour' },
  { id: '1EWuUZYEufw', title: 'The Right Way To Divorce' },
  { id: '1MVc5-CzttQ', title: 'The Major Sign That\'s Already Happened | Signs of the Hour Ep. 2 | Dr. Omar Suleiman' },
  { id: '1OvFQ8XkLoQ', title: 'Foundations Of Good Manners' },
  { id: '2FEz8jsC77k', title: 'Where Is Jesus Now? - Mufti Menk' },
  { id: '2Mq2gvBV3RE', title: 'Evening Adhkar and Dua - Omar Hisham' },
  { id: '2OdO8LoKuo8', title: 'Civilization #37: The Golden Age of Islam' },
  { id: '2ZEmsdEOpbk', title: 'How to Pray Salah | Step by Step' },
  { id: '2kvL5Xsh5MY', title: 'THE 7 LEVELS OF JAHANNAM (HELL)' },
  { id: '2mcNWsZaANw', title: 'Understanding Divine Decree | Predestination | Qadr' },
  { id: '3NRJ0xTE6_Q', title: '7 Levels of Jahannam in Islam — Part 2: Who Goes Where?' },
  { id: '3PRIVXcFiXs', title: 'What is Riba, is it same as Interest Money?' },
  { id: '3WEYp_v0AZk', title: 'Live for What Allah Created You For | Dr. Omar Suleiman' },
  { id: '3Z3R5HuVeYk', title: 'Why did the Angels prostrate to Adam?' },
  { id: '3c1tATNXuYE', title: 'SIMILARITIES BETWEEN CHRISTIANITY AND ISLAM' },
  { id: '3vnhhkRLVCk', title: 'The Difference Between the Bible & the Quran' },
  { id: '4zr6tNgmKSI', title: 'How do Muslims Pray? (ALL 5 Prayers)' },
  { id: '5CDHTMDspIs', title: 'What Is The Ruling On Fasting The Month Of Holy Ramadan?' },
  { id: '5D16ZnWKsR0', title: 'Understanding Qadr (Divine Decree) - Muhammad Tim Humble' },
  { id: '5PLth1OM1MI', title: 'Simple Method of Doing Da\'wah to Non-Muslims' },
  { id: '5WIZjxeQl_E', title: 'THE THRONE OF ALLAH SHOOK! | Dr. Omar Suleiman' },
  { id: '5sYWPiZpV2A', title: 'What To Do When I Make A Mistake In Prayer' },
  { id: '5uWRpTAFlbs', title: 'Quranic evidence on paying RIBA /interest' },
  { id: '5ukUjI2fGL0', title: 'Qur\'an Hifdh Memorization Technique' },
  { id: '5yCmBFslLg8', title: 'The Rashidun Legacy: Uthman & Ali' },
  { id: '62w6ljeMsY0', title: 'Jami at-Tirmidhi, Hadith: 3551' },
  { id: '6C--j-YVFrE', title: 'Why is Interest Haram?' },
  { id: '6_50_POaZNI', title: 'The Categories of Tawheed in Islam' },
  { id: '6ihFXA81wdc', title: 'The 3 Questions in the Grave You Cannot Escape' },
  { id: '6yb3usDSRVs', title: 'Morning Adhkar Daily Supplications' },
  { id: '70ROfxFev94', title: 'Knowing Allah | Introduction & The Name Allah' },
  { id: '7MWlxxh15ww', title: 'How was Prophet Adam created? - Learn with Mufti Menk' },
  { id: '7QpnQ2umSFg', title: 'Purify Your Soul and Grow | The Meaning of Tazkiyah in Islam' },
];

interface URLTestResult {
  videoId: string;
  title: string;
  url: string;
  status: number;
  statusLabel: string;
  pageTitle: string;
  loadTime: number;
  loadSpeed: 'fast' | 'medium' | 'slow';
  mobileResponsive: boolean;
  videoMetadata: {
    duration?: string;
    views?: string;
    publishDate?: string;
  };
  timestamp: string;
}

interface ReportData {
  summary: {
    total: number;
    alive: number;
    redirected: number;
    broken: number;
    averageLoadTime: number;
    reportGeneratedAt: string;
  };
  results: URLTestResult[];
  fastestLinks: URLTestResult[];
  slowestLinks: URLTestResult[];
  mobilityMatrix: {
    compatible: number;
    incompatible: number;
    details: Array<{ videoId: string; compatible: boolean }>;
  };
}

test.describe('36nafs YouTube URLs Validation', () => {
  let reportData: ReportData = {
    summary: {
      total: NAFS_URLS.length,
      alive: 0,
      redirected: 0,
      broken: 0,
      averageLoadTime: 0,
      reportGeneratedAt: new Date().toISOString(),
    },
    results: [],
    fastestLinks: [],
    slowestLinks: [],
    mobilityMatrix: {
      compatible: 0,
      incompatible: 0,
      details: [],
    },
  };

  test('validate all 36 nafs URLs', async ({ page, context, browser }) => {
    const results: URLTestResult[] = [];

    for (const video of NAFS_URLS) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${video.id}`;
      let result: URLTestResult = {
        videoId: video.id,
        title: video.title,
        url: youtubeUrl,
        status: 0,
        statusLabel: 'unknown',
        pageTitle: '',
        loadTime: 0,
        loadSpeed: 'slow',
        mobileResponsive: false,
        videoMetadata: {},
        timestamp: new Date().toISOString(),
      };

      try {
        const startTime = Date.now();

        // Test desktop responsiveness
        const desktopResponse = await page.goto(youtubeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        const desktopLoadTime = Date.now() - startTime;
        result.loadTime = desktopLoadTime;

        if (desktopResponse) {
          result.status = desktopResponse.status();
          result.statusLabel =
            result.status === 200
              ? 'OK'
              : result.status >= 300 && result.status < 400
              ? 'redirected'
              : result.status >= 400
              ? 'broken'
              : 'unknown';

          // Categorize load speed
          result.loadSpeed =
            desktopLoadTime < 5000
              ? 'fast'
              : desktopLoadTime < 10000
              ? 'medium'
              : 'slow';

          // Extract page title
          result.pageTitle = await page.title();

          // Try to extract YouTube video metadata
          const metadata = await extractYouTubeMetadata(page, video.id);
          result.videoMetadata = metadata;
        }
      } catch (error) {
        result.status = 0;
        result.statusLabel = 'error';
        result.loadTime = 15000;
        result.loadSpeed = 'slow';
      }

      // Test mobile responsiveness
      try {
        const mobileContext = await browser.newContext({
          ...context,
          viewport: { width: 375, height: 667 },
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        });

        const mobilePage = await mobileContext.newPage();
        await mobilePage.goto(youtubeUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        // Check if page is responsive on mobile
        const videoPlayer = await mobilePage.locator('video, [class*="player"]').count();
        result.mobileResponsive = videoPlayer > 0;

        reportData.mobilityMatrix.details.push({
          videoId: video.id,
          compatible: result.mobileResponsive,
        });

        if (result.mobileResponsive) {
          reportData.mobilityMatrix.compatible++;
        } else {
          reportData.mobilityMatrix.incompatible++;
        }

        await mobileContext.close();
      } catch (error) {
        result.mobileResponsive = false;
        reportData.mobilityMatrix.incompatible++;
      }

      results.push(result);

      // Update summary counts
      if (result.status === 200) {
        reportData.summary.alive++;
      } else if (result.status >= 300 && result.status < 400) {
        reportData.summary.redirected++;
      } else if (result.status >= 400 || result.status === 0) {
        reportData.summary.broken++;
      }

      console.log(
        `✓ Tested: ${video.id} - Status: ${result.status} (${result.statusLabel}) - Load: ${result.loadTime}ms`
      );
    }

    // Calculate summary stats
    const loadTimes = results.map((r) => r.loadTime);
    reportData.summary.averageLoadTime =
      loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;

    // Sort for fastest/slowest
    const sortedBySpeed = [...results].sort((a, b) => a.loadTime - b.loadTime);
    reportData.fastestLinks = sortedBySpeed.slice(0, 5);
    reportData.slowestLinks = sortedBySpeed.slice(-5).reverse();

    reportData.results = results;

    // Generate JSON report
    const jsonReportPath = '/tmp/nafs-report.json';
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
    console.log(`✓ JSON report saved to ${jsonReportPath}`);

    // Generate HTML report
    const htmlReportPath = '/tmp/nafs-report.html';
    const htmlContent = generateHTMLReport(reportData);
    fs.writeFileSync(htmlReportPath, htmlContent);
    console.log(`✓ HTML report saved to ${htmlReportPath}`);

    // Assertions
    expect(reportData.summary.alive).toBeGreaterThan(0);
    expect(reportData.results.length).toBe(NAFS_URLS.length);
  });

  test('verify report files generated', () => {
    const jsonPath = '/tmp/nafs-report.json';
    const htmlPath = '/tmp/nafs-report.html';

    expect(fs.existsSync(jsonPath)).toBeTruthy();
    expect(fs.existsSync(htmlPath)).toBeTruthy();

    // Verify JSON is valid
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    expect(jsonData.summary).toBeDefined();
    expect(jsonData.results.length).toBe(NAFS_URLS.length);

    // Verify HTML contains summary
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    expect(htmlContent).toContain('36nafs YouTube URL Validation Report');
    expect(htmlContent).toContain('Summary');
  });
});

async function extractYouTubeMetadata(page: any, videoId: string) {
  const metadata: any = {};

  try {
    // Try to extract duration from page
    const durationText = await page
      .locator('[yt-bind-attr*="videoDuration"]')
      .textContent()
      .catch(() => null);
    if (durationText) {
      metadata.duration = durationText;
    }

    // Try to extract view count
    const viewsText = await page
      .locator('[yt-bind-attr*="viewCount"]')
      .textContent()
      .catch(() => null);
    if (viewsText) {
      metadata.views = viewsText;
    }

    // Try to extract publish date
    const publishDateText = await page
      .locator('a[href*="/results?search_query"]')
      .first()
      .textContent()
      .catch(() => null);
    if (publishDateText) {
      metadata.publishDate = publishDateText;
    }
  } catch (error) {
    // Silently fail for metadata extraction
  }

  return metadata;
}

function generateHTMLReport(data: ReportData): string {
  const alivePercent = ((data.summary.alive / data.summary.total) * 100).toFixed(1);
  const redirectPercent = ((data.summary.redirected / data.summary.total) * 100).toFixed(1);
  const brokenPercent = ((data.summary.broken / data.summary.total) * 100).toFixed(1);
  const mobileCompatPercent = (
    (data.mobilityMatrix.compatible / data.summary.total) *
    100
  ).toFixed(1);

  const resultRows = data.results
    .map(
      (r) => `
    <tr class="status-${r.statusLabel}">
      <td class="video-id">${r.videoId}</td>
      <td class="title">${escapeHtml(r.title)}</td>
      <td class="status"><span class="badge badge-${r.statusLabel}">${r.status} ${r.statusLabel}</span></td>
      <td class="load-time ${r.loadSpeed}">${r.loadTime}ms<br><small>${r.loadSpeed}</small></td>
      <td class="mobile"><span class="badge ${r.mobileResponsive ? 'badge-success' : 'badge-danger'}">${r.mobileResponsive ? '✓ Yes' : '✗ No'}</span></td>
    </tr>
  `
    )
    .join('\n');

  const fastestRows = data.fastestLinks
    .map(
      (r) => `
    <tr>
      <td>${r.videoId}</td>
      <td>${escapeHtml(r.title.substring(0, 50))}...</td>
      <td><strong>${r.loadTime}ms</strong></td>
    </tr>
  `
    )
    .join('\n');

  const slowestRows = data.slowestLinks
    .map(
      (r) => `
    <tr>
      <td>${r.videoId}</td>
      <td>${escapeHtml(r.title.substring(0, 50))}...</td>
      <td><strong>${r.loadTime}ms</strong></td>
    </tr>
  `
    )
    .join('\n');

  const mobileDetailsRows = data.mobilityMatrix.details
    .slice(0, 10)
    .map(
      (d) => `
    <tr>
      <td>${d.videoId}</td>
      <td><span class="badge ${d.compatible ? 'badge-success' : 'badge-danger'}">${d.compatible ? 'Compatible' : 'Incompatible'}</span></td>
    </tr>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>36nafs YouTube URL Validation Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
      text-align: center;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      color: #667eea;
    }
    .report-date {
      color: #999;
      font-size: 0.9em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      text-align: center;
      border-left: 5px solid #667eea;
    }
    .summary-card.alive { border-left-color: #4caf50; }
    .summary-card.redirected { border-left-color: #ff9800; }
    .summary-card.broken { border-left-color: #f44336; }
    .summary-card h3 { color: #667eea; font-size: 0.9em; text-transform: uppercase; margin-bottom: 10px; }
    .summary-card .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #333;
    }
    .summary-card .percent {
      font-size: 0.9em;
      color: #999;
      margin-top: 5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }
    h2 {
      color: #667eea;
      font-size: 1.8em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #667eea;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    tr:hover { background: #f5f5f5; }
    .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
    }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .badge-redirected { background: #fff3e0; color: #e65100; }
    .badge-broken { background: #ffebee; color: #c62828; }
    .badge-error { background: #fce4ec; color: #ad1457; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .badge-danger { background: #ffebee; color: #c62828; }
    .status-ok td { background: #f0f8f0; }
    .status-redirected td { background: #fff8f0; }
    .status-broken td { background: #fff0f0; }
    .status-error td { background: #fff0f8; }
    .video-id { font-family: 'Courier New', monospace; font-weight: 600; color: #667eea; }
    .title { max-width: 400px; word-break: break-word; }
    .load-time { text-align: center; font-family: 'Courier New', monospace; }
    .load-time.fast { color: #4caf50; font-weight: bold; }
    .load-time.medium { color: #ff9800; font-weight: bold; }
    .load-time.slow { color: #f44336; font-weight: bold; }
    .mobile { text-align: center; }
    .mobile-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .mobile-stat {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .mobile-stat .value {
      font-size: 1.8em;
      font-weight: bold;
      color: #667eea;
    }
    .mobile-stat .label {
      font-size: 0.9em;
      color: #999;
      margin-top: 5px;
    }
    .recommendations {
      background: #fff3e0;
      padding: 20px;
      border-left: 5px solid #ff9800;
      border-radius: 8px;
      margin: 20px 0;
    }
    .recommendations h3 {
      color: #e65100;
      margin-bottom: 10px;
    }
    .recommendations ul {
      list-style-position: inside;
      color: #666;
    }
    .recommendations li {
      margin: 8px 0;
    }
    footer {
      text-align: center;
      color: white;
      padding: 20px;
      margin-top: 40px;
    }
    .scroll-table {
      overflow-x: auto;
    }
    @media (max-width: 768px) {
      .summary-grid { grid-template-columns: 1fr; }
      table { font-size: 0.9em; }
      th, td { padding: 10px 8px; }
      .mobile-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>36nafs YouTube URL Validation Report</h1>
      <p class="report-date">Generated: ${new Date(data.summary.reportGeneratedAt).toLocaleString()}</p>
    </header>

    <div class="summary-grid">
      <div class="summary-card alive">
        <h3>Alive Links</h3>
        <div class="value">${data.summary.alive}</div>
        <div class="percent">${alivePercent}%</div>
      </div>
      <div class="summary-card redirected">
        <h3>Redirected</h3>
        <div class="value">${data.summary.redirected}</div>
        <div class="percent">${redirectPercent}%</div>
      </div>
      <div class="summary-card broken">
        <h3>Broken Links</h3>
        <div class="value">${data.summary.broken}</div>
        <div class="percent">${brokenPercent}%</div>
      </div>
      <div class="summary-card">
        <h3>Avg Load Time</h3>
        <div class="value">${data.summary.averageLoadTime.toFixed(0)}</div>
        <div class="percent">milliseconds</div>
      </div>
    </div>

    <div class="section">
      <h2>Performance Analysis</h2>
      <h3>Fastest Links</h3>
      <div class="scroll-table">
        <table>
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Title</th>
              <th>Load Time</th>
            </tr>
          </thead>
          <tbody>
            ${fastestRows}
          </tbody>
        </table>
      </div>

      <h3 style="margin-top: 30px;">Slowest Links</h3>
      <div class="scroll-table">
        <table>
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Title</th>
              <th>Load Time</th>
            </tr>
          </thead>
          <tbody>
            ${slowestRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Mobile Compatibility</h2>
      <div class="mobile-grid">
        <div class="mobile-stat">
          <div class="value">${data.mobilityMatrix.compatible}</div>
          <div class="label">Compatible</div>
        </div>
        <div class="mobile-stat">
          <div class="value">${data.mobilityMatrix.incompatible}</div>
          <div class="label">Incompatible</div>
        </div>
        <div class="mobile-stat">
          <div class="value">${mobileCompatPercent}%</div>
          <div class="label">Compatibility Rate</div>
        </div>
      </div>

      <h3 style="margin-top: 20px;">Sample Mobile Test Results</h3>
      <div class="scroll-table">
        <table>
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Mobile Status</th>
            </tr>
          </thead>
          <tbody>
            ${mobileDetailsRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Detailed Results</h2>
      <div class="scroll-table">
        <table>
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Title</th>
              <th>HTTP Status</th>
              <th>Load Time (Speed)</th>
              <th>Mobile Responsive</th>
            </tr>
          </thead>
          <tbody>
            ${resultRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h2>Recommendations</h2>
      <div class="recommendations">
        <h3>Dead Link Alternatives</h3>
        ${data.summary.broken > 0 ? `
          <ul>
            <li>Review ${data.summary.broken} broken video(s) and update with current valid URLs</li>
            <li>Check YouTube for removed or private videos</li>
            <li>Consider requesting archival versions from the content providers</li>
            <li>Update internal links to redirect to alternative educational content</li>
          </ul>
        ` : '<p>All links are currently accessible! No dead links found.</p>'}
      </div>

      ${data.summary.redirected > 0 ? `
        <div class="recommendations" style="border-left-color: #ff9800; background: #fff8e1;">
          <h3 style="color: #e65100;">Redirect Notice</h3>
          <ul>
            <li>${data.summary.redirected} video(s) are being redirected (HTTP 301/302)</li>
            <li>Monitor redirect chains to ensure they're not broken in the future</li>
            <li>Consider updating bookmarks to point to final destinations</li>
          </ul>
        </div>
      ` : ''}

      <div class="recommendations" style="border-left-color: #4caf50; background: #f0f8f0;">
        <h3 style="color: #2e7d32;">Performance Insights</h3>
        <ul>
          <li>Average load time: <strong>${data.summary.averageLoadTime.toFixed(0)}ms</strong></li>
          <li>Mobile compatibility: <strong>${mobileCompatPercent}%</strong> of videos are mobile-responsive</li>
          <li>Fastest video loads in <strong>${data.fastestLinks[0]?.loadTime || 'N/A'}ms</strong></li>
          <li>Consider optimizing slow-loading videos (>10s) with adaptive bitrate streaming</li>
        </ul>
      </div>
    </div>

    <footer>
      <p>Generated by 36nafs YouTube URL Validation Suite • ${new Date().toLocaleDateString()}</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
