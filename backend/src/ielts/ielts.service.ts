import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType, Role } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { JwtPayload } from '../auth/jwt-payload.interface';

export const IELTS_EXIT_BUTTON_HTML = `<button type="button" class="ielts-exit-btn" onclick="window.parent.postMessage({type: 'CLOSE_IELTS_TASK'}, '*')" style="display:inline-flex; align-items:center; justify-content:center; padding:7px 14px; border:none; border-radius:6px; background-color:#ef4444; color:white; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; gap:6px; transition:background-color 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05); white-space:nowrap; flex-shrink:0;" onmouseover="this.style.backgroundColor='#dc2626'" onmouseout="this.style.backgroundColor='#ef4444'">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
  Exit
</button>`;

export const IELTS_RETAKE_BUTTON_HTML = `<button type="button" class="ielts-retake-btn" onclick="window.parent.postMessage({type: 'RETAKE_IELTS_TASK'}, '*')" style="display:inline-flex; align-items:center; justify-content:center; padding:7px 14px; border:none; border-radius:6px; background-color:#2563eb; color:white; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; gap:6px; transition:background-color 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05); white-space:nowrap; flex-shrink:0;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <polyline points="3 3 3 8 8 8"></polyline>
  </svg>
  Retake
</button>`;

export const IELTS_HEADER_FIX_STYLES = `<style id="ielts-header-fix">
  .header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    height: 60px !important;
    padding: 0 20px !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 100 !important;
    background-color: #ffffff !important;
    box-sizing: border-box !important;
    gap: 12px !important;
    border-bottom: 1px solid #e5e7eb !important;
    white-space: nowrap !important;
  }
  .header-zone {
    display: flex !important;
    align-items: center !important;
  }
  .header-left-zone {
    justify-content: flex-start !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    gap: 10px !important;
  }
  .header-center-zone {
    justify-content: center !important;
    flex: 0 0 auto !important;
    gap: 10px !important;
  }
  .header-right-zone {
    justify-content: flex-end !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    gap: 10px !important;
  }
  .header-tools {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  .header-tool-btn {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 42px !important;
    height: 36px !important;
    border: 1px solid #d5d9e0 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    cursor: pointer !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
    transition: background 0.15s, border-color 0.15s !important;
  }
  .header-tool-btn:hover {
    background: #f3f4f6 !important;
    border-color: #9ca3af !important;
  }
  .header-tool-btn svg {
    width: 18px !important;
    height: 18px !important;
    fill: #1f2937 !important;
    display: block !important;
  }
  .part-indicator, .timer-container {
    margin: 0 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .ielts-exit-btn {
    flex-shrink: 0 !important;
  }
  .ielts-preview-badge {
    flex-shrink: 0 !important;
  }

  body.theme-dark .header {
    background-color: #26282d !important;
    border-color: #3a3d43 !important;
  }
  body.theme-dark .header-tool-btn {
    background: #26282d !important;
    border-color: #4b5057 !important;
  }
  body.theme-dark .header-tool-btn svg {
    fill: #e5e7eb !important;
  }
  body.theme-dark .ielts-preview-badge {
    background-color: #1e293b !important;
    color: #60a5fa !important;
    border-color: #2563eb !important;
  }

  /* Mobile Responsive adjustments (phones <= 640px) */
  @media (max-width: 640px) {
    .header {
      padding: 0 8px !important;
      gap: 6px !important;
    }
    .header-left-zone {
      gap: 4px !important;
    }
    .header-center-zone {
      gap: 6px !important;
    }
    .header-right-zone {
      gap: 4px !important;
    }
    .header-tools {
      gap: 4px !important;
    }
    .header-tool-btn {
      width: 34px !important;
      height: 32px !important;
      border-radius: 6px !important;
    }
    .header-tool-btn svg {
      width: 16px !important;
      height: 16px !important;
    }
    .ielts-exit-btn, .ielts-retake-btn {
      padding: 5px 9px !important;
      font-size: 11px !important;
      gap: 4px !important;
      border-radius: 5px !important;
    }
    .ielts-exit-btn svg, .ielts-retake-btn svg {
      width: 13px !important;
      height: 13px !important;
    }
    .ielts-preview-badge {
      padding: 4px 7px !important;
      font-size: 11px !important;
      gap: 4px !important;
      border-radius: 5px !important;
    }
    .ielts-preview-badge svg {
      width: 13px !important;
      height: 13px !important;
    }
    .timer-container, .part-indicator {
      font-size: 12px !important;
    }
  }

  /* Small Mobile (phones <= 480px) */
  @media (max-width: 480px) {
    .header {
      padding: 0 6px !important;
      gap: 4px !important;
    }
    .header-center-zone {
      gap: 4px !important;
    }
    .ielts-exit-btn, .ielts-retake-btn {
      padding: 4px 7px !important;
      font-size: 10.5px !important;
      gap: 3px !important;
    }
    .ielts-preview-badge {
      padding: 4px 6px !important;
      font-size: 10.5px !important;
      gap: 3px !important;
    }
  }

  /* Extra Small Mobile (phones <= 420px) */
  @media (max-width: 420px) {
    .header {
      padding: 0 4px !important;
      gap: 3px !important;
    }
    .header-center-zone {
      gap: 3px !important;
    }
    .header-tools {
      gap: 2px !important;
    }
    .header-tool-btn {
      width: 28px !important;
      height: 26px !important;
    }
    .header-tool-btn svg {
      width: 13px !important;
      height: 13px !important;
    }
    .ielts-exit-btn, .ielts-retake-btn {
      padding: 4px 6px !important;
      font-size: 10px !important;
      gap: 2px !important;
    }
    .ielts-exit-btn svg, .ielts-retake-btn svg {
      width: 11px !important;
      height: 11px !important;
    }
    .ielts-preview-badge {
      padding: 3px 5px !important;
      font-size: 10px !important;
    }
    .ielts-preview-badge .preview-badge-text {
      display: none !important;
    }
  }

  /* Audio icons and volume slider in header */
  .header-icons {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin: 0 !important;
  }
  .header-icons .icon {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    border: none !important;
    background: transparent !important;
    padding: 4px !important;
    border-radius: 6px !important;
    color: #374151 !important;
    transition: background-color 0.15s, color 0.15s !important;
  }
  .header-icons .icon:hover {
    background-color: #f3f4f6 !important;
    color: #111827 !important;
  }
  .header-icons .icon svg {
    width: 20px !important;
    height: 20px !important;
    display: block !important;
  }
  .header-icons #play-pause-btn {
    width: 36px !important;
    height: 36px !important;
    border-radius: 8px !important;
    background: #2563eb !important;
    color: #ffffff !important;
    border: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: background-color 0.15s !important;
  }
  .header-icons #play-pause-btn:hover {
    background: #1d4ed8 !important;
  }
  .header-icons #play-pause-btn svg {
    fill: #ffffff !important;
    width: 18px !important;
    height: 18px !important;
  }
  .header-icons #volume-slider {
    -webkit-appearance: none !important;
    appearance: none !important;
    width: 80px !important;
    height: 6px !important;
    background: #e5e7eb !important;
    outline: none !important;
    border-radius: 3px !important;
    cursor: pointer !important;
  }
  .header-icons #volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none !important;
    appearance: none !important;
    width: 14px !important;
    height: 14px !important;
    border-radius: 50% !important;
    background: #2563eb !important;
    cursor: pointer !important;
    border: 2px solid #ffffff !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
  }
  .header-icons #volume-slider::-moz-range-thumb {
    width: 14px !important;
    height: 14px !important;
    border-radius: 50% !important;
    background: #2563eb !important;
    cursor: pointer !important;
    border: 2px solid #ffffff !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
  }
  body.theme-dark .header-icons .icon {
    color: #9ca3af !important;
  }
  body.theme-dark .header-icons .icon:hover {
    background-color: #374151 !important;
    color: #f9fafb !important;
  }
  body.theme-dark .header-icons .icon svg {
    color: #d1d5db !important;
    stroke: #d1d5db !important;
  }
  body.theme-dark .header-icons #volume-slider {
    background: #4b5563 !important;
  }
</style>
`;

export function extractBalancedDiv(html: string, className: string): string | null {
  const startRegex = new RegExp(`<div[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i');
  const match = html.match(startRegex);
  if (!match || match.index === undefined) return null;
  const startIndex = match.index;
  let depth = 0;
  let i = startIndex;
  while (i < html.length) {
    if (html.slice(i, i + 4).toLowerCase() === '<div') {
      depth++;
      i += 4;
    } else if (html.slice(i, i + 6).toLowerCase() === '</div>') {
      depth--;
      i += 6;
      if (depth === 0) {
        return html.slice(startIndex, i);
      }
    } else {
      i++;
    }
  }
  return null;
}

export function normalizeIeltsHeader(contentHtml: string, isPreview?: boolean, isReview?: boolean): string {
  const showReviewUi = isPreview || isReview;
  const retakeBtnHtml = isReview ? IELTS_RETAKE_BUTTON_HTML : '';
  const previewBadgeHtml = showReviewUi
    ? `<span class="ielts-preview-badge" style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:6px; background-color:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-family:inherit; font-size:12px; font-weight:700; user-select:none; white-space:nowrap; flex-shrink:0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span class="preview-badge-text">Review Mode</span>
      </span>`
    : '';

  const centerZoneHtml = `<div class="header-zone header-center-zone">\n      ${IELTS_EXIT_BUTTON_HTML}\n      ${retakeBtnHtml}\n      ${previewBadgeHtml}\n    </div>`;

  const headerHtml = extractBalancedDiv(contentHtml, 'header');
  if (!headerHtml) {
    return contentHtml;
  }

  const partIndicator = extractBalancedDiv(headerHtml, 'part-indicator') || '';
  const timerContainer = extractBalancedDiv(headerHtml, 'timer-container') || '';
  const headerTools = extractBalancedDiv(headerHtml, 'header-tools') || '';
  const headerIcons = extractBalancedDiv(headerHtml, 'header-icons') || '';

  let leftContent = partIndicator;
  if (timerContainer && !leftContent.includes('timer-container')) {
    leftContent += (leftContent ? ' ' : '') + timerContainer;
  }

  let rightContent = '';
  if (headerIcons) {
    rightContent += headerIcons;
  }
  if (headerTools) {
    rightContent += (rightContent ? ' ' : '') + headerTools;
  }

  const leftZoneHtml = `<div class="header-zone header-left-zone">${leftContent}</div>`;
  const rightZoneHtml = `<div class="header-zone header-right-zone">${rightContent}</div>`;

  const newHeaderHtml = `<div class="header">\n    ${leftZoneHtml}\n    ${centerZoneHtml}\n    ${rightZoneHtml}\n  </div>`;

  return contentHtml.replace(headerHtml, newHeaderHtml);
}

export const IELTS_ESC_LISTENER_SCRIPT = `<script>
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.parent.postMessage({ type: 'ESCAPE_PRESSED' }, '*');
    }
  });
</script>`;

export const IELTS_SUBMISSION_SCRIPT = `<script>
  (function() {
    var hasDispatched = false;

    function extractAndDispatch() {
      if (hasDispatched) return;

      var curScore = 0;
      var totalQ = 40;
      var curBand = 0;
      var results = [];

      // 1. Extract from #score-summary if rendered ('You scored 28 out of 40 (Band 6.5).')
      var scoreEl = document.getElementById('score-summary');
      if (scoreEl && scoreEl.textContent && scoreEl.textContent.trim().length > 0) {
        var text = scoreEl.textContent.trim();
        var m = text.match(/(\\d+)\\s+out of\\s+(\\d+)\\s*\\(Band\\s*([\\d.]+)\\)/i);
        if (m) {
          curScore = parseInt(m[1], 10);
          totalQ = parseInt(m[2], 10);
          curBand = parseFloat(m[3]);
        }
      }

      // 2. Extract detailed question results from #result-details
      var rows = document.querySelectorAll('#result-details table tbody tr');
      if (rows && rows.length > 0) {
        rows.forEach(function(row) {
          var cols = row.querySelectorAll('td');
          if (cols.length >= 4) {
            var isCorr = cols[3].classList.contains('result-correct') ||
                         cols[3].textContent.indexOf('Correct') !== -1 ||
                         cols[3].textContent.indexOf('✓') !== -1;
            results.push({
              question: cols[0].textContent.trim(),
              userAnswer: cols[1].textContent.trim(),
              correctAnswer: cols[2].textContent.trim(),
              isCorrect: isCorr
            });
          }
        });
        if (curScore === 0 && results.length > 0) {
          curScore = results.filter(function(r) { return r.isCorrect; }).length;
          totalQ = results.length;
        }
      }

      // 3. Fallback to counting correct question classes if results table wasn't found
      if (curScore === 0 && document.querySelectorAll('.subQuestion.correct').length > 0) {
        curScore = document.querySelectorAll('.subQuestion.correct').length;
      }

      // Fallback band calculation if curBand is 0 and curScore > 0
      if (curBand === 0 && curScore > 0) {
        var r = curScore;
        if (r >= 39) curBand = 9;
        else if (r >= 37) curBand = 8.5;
        else if (r >= 35) curBand = 8;
        else if (r >= 33) curBand = 7.5;
        else if (r >= 30) curBand = 7;
        else if (r >= 26) curBand = 6.5;
        else if (r >= 23) curBand = 6;
        else if (r >= 18) curBand = 5.5;
        else if (r >= 15) curBand = 5;
        else if (r >= 13) curBand = 4.5;
        else if (r >= 10) curBand = 4;
        else if (r >= 8) curBand = 3.5;
        else if (r >= 6) curBand = 3;
        else if (r >= 4) curBand = 2.5;
        else if (r >= 2) curBand = 2;
        else if (r === 1) curBand = 1.5;
        else curBand = 0;
      }

      var isResultsActive = (document.querySelector('.results-mode') !== null) ||
                            (scoreEl && scoreEl.textContent && scoreEl.textContent.indexOf('out of') !== -1) ||
                            (results.length > 0);

      if (!isResultsActive) {
        return;
      }

      hasDispatched = true;

      try {
        window.parent.postMessage({
          type: 'IELTS_TEST_SUBMITTED',
          payload: {
            score: curScore,
            total: totalQ,
            band: curBand,
            results: results
          }
        }, '*');
      } catch(err) {
        console.error('Failed to dispatch IELTS submission message', err);
      }
    }

    // Approach A: Wrap window.checkAnswers if available
    var checkInterval = setInterval(function() {
      if (typeof window.checkAnswers === 'function' && !window.checkAnswers.__wrapped) {
        var orig = window.checkAnswers;
        window.checkAnswers = function() {
          var res = orig.apply(this, arguments);
          setTimeout(extractAndDispatch, 50);
          return res;
        };
        window.checkAnswers.__wrapped = true;
      }
    }, 100);

    // Approach B: Capture clicks on submit buttons and modals
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;
      var isSubmitAction =
        target.id === 'confirm-submit-ok' ||
        target.id === 'deliver-button' ||
        target.closest('#confirm-submit-ok') ||
        target.closest('#deliver-button') ||
        target.classList.contains('footer__deliverButton___3FM07') ||
        target.closest('.footer__deliverButton___3FM07') ||
        target.classList.contains('submit-button') ||
        target.closest('.submit-button') ||
        target.classList.contains('check-button') ||
        target.closest('.check-button');

      if (isSubmitAction) {
        setTimeout(extractAndDispatch, 100);
        setTimeout(extractAndDispatch, 300);
        setTimeout(extractAndDispatch, 600);
        setTimeout(extractAndDispatch, 1200);
      }
    }, true);

    // Approach C: MutationObserver on document.documentElement
    if (window.MutationObserver) {
      var observer = new MutationObserver(function() {
        var scoreEl = document.getElementById('score-summary');
        if (scoreEl && scoreEl.textContent && scoreEl.textContent.indexOf('out of') !== -1) {
          extractAndDispatch();
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    // Approach D: Polling interval
    var pollTimer = setInterval(function() {
      if (hasDispatched) {
        clearInterval(pollTimer);
        clearInterval(checkInterval);
        return;
      }
      var scoreEl = document.getElementById('score-summary');
      if (scoreEl && scoreEl.textContent && scoreEl.textContent.indexOf('out of') !== -1) {
        extractAndDispatch();
      }
    }, 500);
  })();
</script>`;

export const IELTS_REVIEW_MODE_SCRIPT = `<script>
  (function() {
    function lockInputs() {
      document.querySelectorAll('input, select, textarea').forEach(function(el) {
        el.disabled = true;
      });
      var deliverBtn = document.getElementById('deliver-button');
      if (deliverBtn) {
        deliverBtn.style.display = 'none';
      }
      var submitBtns = document.querySelectorAll('button[type="submit"], .submit-button, .check-button');
      submitBtns.forEach(function(b) {
        b.style.display = 'none';
      });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', lockInputs);
    } else {
      lockInputs();
    }
    setTimeout(lockInputs, 200);
  })();
</script>`;

export function buildReviewModeScript(submission?: {
  score: number;
  total: number;
  band: number;
  results: Array<{
    question: string | number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}) {
  if (!submission) {
    return IELTS_REVIEW_MODE_SCRIPT;
  }
  const safeData = JSON.stringify(submission);
  return `<script>
  (function() {
    var data = ${safeData};
    if (!data) return;

    function lockAndApply() {
      // 1. Lock all inputs
      document.querySelectorAll('input, select, textarea').forEach(function(el) {
        el.disabled = true;
      });

      // 2. Put container in results-mode
      var mainContainer = document.querySelector('.main-container');
      if (mainContainer) {
        mainContainer.classList.add('results-mode');
      }

      // 3. Switch to part 1 if function exists
      if (typeof window.switchToPart === 'function') {
        try { window.switchToPart(1); } catch(e) {}
      }

      // 4. Fill score summary
      var scoreEl = document.getElementById('score-summary');
      if (scoreEl) {
        scoreEl.textContent = 'You scored ' + data.score + ' out of ' + data.total + ' (Band ' + data.band + ').';
      }

      // 5. Build results details table
      var resultDetails = document.getElementById('result-details');
      if (resultDetails && Array.isArray(data.results) && data.results.length > 0) {
        var html = '<table><thead><tr><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr></thead><tbody>';
        data.results.forEach(function(r) {
          html += '<tr><td>' + r.question + '</td><td>' + (r.userAnswer || 'No Answer') + '</td><td>' + (r.correctAnswer || '') + '</td><td class="' + (r.isCorrect ? 'result-correct' : 'result-incorrect') + '">' + (r.isCorrect ? '&#10003; Correct' : '&#10007; Incorrect') + '</td></tr>';
        });
        html += '</tbody></table>';
        resultDetails.innerHTML = html;
      }

      // 6. Deliver / My Results button and click listeners
      var deliverBtn = document.getElementById('deliver-button');
      if (deliverBtn) {
        deliverBtn.style.display = 'inline-flex';
        deliverBtn.classList.add('success');
        deliverBtn.innerHTML = '<span>My Results</span>';
        deliverBtn.onclick = function(e) {
          if (e) e.preventDefault();
          var m = document.getElementById('result-modal');
          if (m) m.style.display = 'flex';
        };
      }

      var modalCloseBtn = document.getElementById('modal-close-button');
      if (modalCloseBtn) {
        modalCloseBtn.onclick = function(e) {
          if (e) e.preventDefault();
          var m = document.getElementById('result-modal');
          if (m) m.style.display = 'none';
        };
      }

      // 7. Automatically open the result modal in review mode
      var modal = document.getElementById('result-modal');
      if (modal) {
        modal.style.display = 'flex';
      }

      // 8. Populate user answers and visual feedback in the questions
      if (Array.isArray(data.results)) {
        data.results.forEach(function(r) {
          var qKey = 'q' + r.question;
          var qNum = parseInt(String(r.question).replace('q', ''), 10);
          if (!isNaN(qNum)) {
            var navBtn = document.querySelector('.subQuestion[onclick*="goToQuestion(' + qNum + ')"]');
            if (navBtn) {
              navBtn.classList.remove('answered');
              navBtn.classList.add(r.isCorrect ? 'correct' : 'incorrect');
            }
          }

          var textInput = document.getElementById(qKey);
          if (textInput && textInput.type !== 'checkbox' && textInput.type !== 'radio') {
            if (r.userAnswer && r.userAnswer !== 'No Answer') {
              textInput.value = r.userAnswer;
            }
            textInput.classList.add(r.isCorrect ? 'correct' : 'incorrect');
            if (!r.isCorrect && r.correctAnswer && !textInput.nextElementSibling?.classList?.contains('correct-inline')) {
              var sp = document.createElement('span');
              sp.className = 'correct-inline';
              sp.textContent = r.correctAnswer;
              textInput.insertAdjacentElement('afterend', sp);
            }
          }

          if (r.userAnswer && r.userAnswer !== 'No Answer') {
            var radios = document.querySelectorAll('input[type="radio"][name="' + qKey + '"]');
            radios.forEach(function(rad) {
              if (rad.value === r.userAnswer) {
                rad.checked = true;
              }
              var wrapper = rad.closest('.multi-choice-option');
              if (wrapper) {
                if (rad.value === r.correctAnswer) wrapper.classList.add('correct');
                else if (rad.checked) wrapper.classList.add('incorrect');
              }
            });
          }
        });
      }
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function() {
        setTimeout(lockAndApply, 50);
      });
    } else {
      setTimeout(lockAndApply, 50);
    }

    setTimeout(lockAndApply, 300);
    setTimeout(lockAndApply, 800);
  })();
</script>`;
}

export const IELTS_WRITING_SUBMISSION_SCRIPT = `<script>
  (function() {
    var hasDispatched = false;

    function extractAndDispatchWriting() {
      if (hasDispatched) return;

      var currentText = '';
      var textarea = document.getElementById('writingTextarea');
      if (textarea) {
        currentText = textarea.value;
      }

      var part1 = localStorage.getItem('ielts-writing-part-1') || '';
      var part2 = localStorage.getItem('ielts-writing-part-2') || '';

      var part2El = document.getElementById('part-2');
      var isPart2 = part2El && !part2El.classList.contains('hidden');
      if (isPart2) {
        part2 = currentText || part2;
      } else {
        part1 = currentText || part1;
      }

      var p1Words = part1.trim() === '' ? 0 : part1.trim().split(/\\s+/).length;
      var p2Words = part2.trim() === '' ? 0 : part2.trim().split(/\\s+/).length;
      var totalWords = p1Words + p2Words;

      hasDispatched = true;

      try {
        window.parent.postMessage({
          type: 'IELTS_TEST_SUBMITTED',
          payload: {
            score: totalWords,
            total: 400,
            band: 0,
            results: [
              {
                question: 'Task 1',
                userAnswer: part1,
                wordCount: p1Words,
                targetWords: 150,
                isCompleted: p1Words >= 150
              },
              {
                question: 'Task 2',
                userAnswer: part2,
                wordCount: p2Words,
                targetWords: 250,
                isCompleted: p2Words >= 250
              }
            ]
          }
        }, '*');
      } catch(err) {
        console.error('Failed to dispatch IELTS writing submission', err);
      }
    }

    // Override global saveWritingToFile to dispatch directly instead of download
    window.saveWritingToFile = function(p1, p2) {
      extractAndDispatchWriting();
    };

    // Override submitTest
    if (typeof window.submitTest === 'function') {
      var origSubmit = window.submitTest;
      window.submitTest = function() {
        extractAndDispatchWriting();
      };
    }

    // Intercept submit click
    document.addEventListener('click', function(e) {
      var target = e.target;
      if (!target) return;
      var isSubmit =
        target.id === 'deliver-button' ||
        target.closest('#deliver-button') ||
        target.classList.contains('footer__deliverButton___3FM07') ||
        target.closest('.footer__deliverButton___3FM07');

      if (isSubmit) {
        setTimeout(extractAndDispatchWriting, 50);
      }
    }, true);
  })();
</script>`;

export function buildWritingReviewModeScript(submission?: {
  score: number;
  total: number;
  band: number;
  answersJson: any;
}) {
  const safeData = JSON.stringify(submission?.answersJson || []);
  return `<script>
  (function() {
    var results = ${safeData};
    var part1Answer = '';
    var part2Answer = '';

    if (Array.isArray(results)) {
      results.forEach(function(r) {
        if (r.question === 'Task 1' || r.task === 1) {
          part1Answer = r.userAnswer || '';
        } else if (r.question === 'Task 2' || r.task === 2) {
          part2Answer = r.userAnswer || '';
        }
      });
    }

    function lockAndPopulate() {
      var textarea = document.getElementById('writingTextarea');
      if (textarea) {
        textarea.disabled = true;
        textarea.readOnly = true;
      }

      var deliverBtn = document.getElementById('deliver-button');
      if (deliverBtn) {
        deliverBtn.style.display = 'none';
      }

      var part2 = document.getElementById('part-2');
      var isPart2 = part2 && !part2.classList.contains('hidden');
      if (textarea) {
        textarea.value = isPart2 ? part2Answer : part1Answer;
        if (typeof window.updateWordCount === 'function') {
          try { window.updateWordCount(); } catch(e) {}
        }
      }

      try {
        localStorage.setItem('ielts-writing-part-1', part1Answer);
        localStorage.setItem('ielts-writing-part-2', part2Answer);
        if (typeof window.updateCompletionIndicators === 'function') {
          window.updateCompletionIndicators();
        }
      } catch(e) {}
    }

    if (typeof window.switchPart === 'function') {
      var origSwitch = window.switchPart;
      window.switchPart = function(partNum) {
        origSwitch(partNum);
        var textarea = document.getElementById('writingTextarea');
        if (textarea) {
          textarea.value = (partNum === 2) ? part2Answer : part1Answer;
          textarea.disabled = true;
          textarea.readOnly = true;
          if (typeof window.updateWordCount === 'function') {
            try { window.updateWordCount(); } catch(e) {}
          }
        }
      };
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', lockAndPopulate);
    } else {
      lockAndPopulate();
    }
    setTimeout(lockAndPopulate, 100);
    setTimeout(lockAndPopulate, 500);
  })();
</script>`;
}

export function detectIeltsTaskType(contentHtml: string): IeltsTaskType | 'UNKNOWN' {
  const hasWritingMarkers =
    /writing-textarea/i.test(contentHtml) ||
    /class=["'][^"']*writing-part[^"']*["']/i.test(contentHtml) ||
    /id=["']part-header-[12]["']/i.test(contentHtml) ||
    /ielts-writing-part-[12]/i.test(contentHtml) ||
    /<title>[^<]*writing[^<]*<\/title>/i.test(contentHtml);

  if (hasWritingMarkers) {
    return IeltsTaskType.WRITING;
  }

  const hasAudio =
    /<audio\b/i.test(contentHtml) ||
    /id=["']global-audio-player["']/i.test(contentHtml) ||
    /\.mp3\b/i.test(contentHtml);

  const titleMatch = contentHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : '';

  const hasReadingMarkers =
    /reading-passage/i.test(contentHtml) ||
    /passage-panel/i.test(contentHtml) ||
    /passage-title/i.test(contentHtml) ||
    /passage\s*[1-3]/i.test(contentHtml) ||
    title.includes('reading');

  const hasListeningMarkers =
    hasAudio ||
    title.includes('listening');

  if (hasListeningMarkers && !hasReadingMarkers) {
    return IeltsTaskType.LISTENING;
  }
  if (hasReadingMarkers && !hasListeningMarkers) {
    return IeltsTaskType.READING;
  }
  if (hasAudio) {
    return IeltsTaskType.LISTENING;
  }
  if (hasReadingMarkers) {
    return IeltsTaskType.READING;
  }
  return 'UNKNOWN';
}

export function extractTaskTitle(contentHtml: string, filename?: string): string {
  // 1. Reading passage title class
  const passageTitleMatch = contentHtml.match(
    /class=["'][^"']*passage-title[^"']*["'][^>]*>([^<]+)<\/[a-z0-9]+>/i,
  );
  if (passageTitleMatch && passageTitleMatch[1]?.trim()) {
    return passageTitleMatch[1].trim();
  }

  // 2. Reading centered heading (e.g. <h4 class="text-center">)
  const h4Match = contentHtml.match(
    /<h4[^>]*class=["'][^"']*text-center[^"']*["'][^>]*>([^<]+)<\/h4>/i,
  );
  if (h4Match && h4Match[1]?.trim()) {
    return h4Match[1].trim();
  }

  // 3. Listening centered title
  const centeredTitleMatch = contentHtml.match(
    /class=["'][^"']*centered-title[^"']*["'][^>]*>([^<]+)<\/[a-z0-9]+>/i,
  );
  if (centeredTitleMatch && centeredTitleMatch[1]?.trim()) {
    return centeredTitleMatch[1].trim();
  }

  // 4. Other prominent headings, excluding generic terms
  const headings = Array.from(contentHtml.matchAll(/<h[1-4][^>]*>([^<]+)<\/h[1-4]>/gi))
    .map((m) => m[1].trim())
    .filter(
      (t) =>
        !/^(ielts|results?|your\s*results?|transcription|correct\s*answers?:?|part\s*[1-4]|passage\s*[1-3]|questions?\s*\d+.*)$/i.test(
          t,
        ),
    );
  if (headings.length > 0) {
    return headings[0];
  }

  // 5. Form/Notes title in <strong> or <b> (e.g. in Listening Section 1)
  const strongs = Array.from(
    contentHtml.matchAll(/<(strong|b)[^>]*>([^<]{5,60})<\/(strong|b)>/gi),
  )
    .map((m) => m[2].trim())
    .filter(
      (t) =>
        !/^(ielts|results?|your\s*results?|transcription|correct\s*answers?:?|part\s*[1-4]|passage\s*[1-3]|questions?\s*\d+.*|one\s*word.*|no\s*more\s*than.*|write\s*no\s*more.*|name:?|date:?|address:?|choose.*|letters?.*)$/i.test(
          t,
        ) && !/^[A-E](?:\s*,\s*[A-E])*(?:\s+or\s+[A-E])?$/i.test(t),
    );
  if (strongs.length > 0) {
    return strongs[0];
  }

  // 6. Title tag if NOT generic
  const titleTag = contentHtml.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (
    titleTag &&
    !/^(ielts\s*cdi.*|ielts\s*full.*|ielts\s*reading.*|ielts\s*listening.*|ielts)$/i.test(
      titleTag,
    )
  ) {
    return titleTag;
  }

  // 7. Clean filename
  if (filename) {
    return filename
      .replace(/\.html?$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  return 'New Task';
}

@Injectable()
export class IeltsService {
  constructor(private prisma: PrismaService) {}

  async uploadTask(
    user: JwtPayload,
    title: string,
    type: IeltsTaskType,
    htmlFile: Express.Multer.File,
    groupId?: string,
  ) {
    if (!htmlFile || !htmlFile.buffer) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.VALIDATION_FAILED,
        message: 'File is required',
      });
    }

    let contentHtml = htmlFile.buffer.toString('utf-8');

    if (!title || !title.trim()) {
      title = extractTaskTitle(contentHtml, htmlFile.originalname);
    }

    const trimmedTitle = title.trim();

    // Check if task with identical title and type already exists in the database
    const existingTask = await this.prisma.ieltsTask.findFirst({
      where: {
        title: { equals: trimmedTitle, mode: 'insensitive' },
        type,
      },
    });

    if (existingTask) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.TASK_ALREADY_EXISTS,
        message: `Task with title "${trimmedTitle}" already exists`,
      });
    }

    let teacherId = user.profileId;
    if (!teacherId) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      teacherId = teacherProfile?.id ?? null;
    }

    if (!teacherId) {
      const anyTeacher = await this.prisma.teacherProfile.findFirst();
      if (!anyTeacher) {
        throw new BadRequestException({
          errorCode: ERROR_CODES.TEACHER_NOT_FOUND,
          message: 'Teacher profile required to associate task',
        });
      }
      teacherId = anyTeacher.id;
    }

    const detectedType = detectIeltsTaskType(contentHtml);
    if (
      detectedType !== 'UNKNOWN' &&
      detectedType !== type
    ) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.TASK_TYPE_MISMATCH,
        message: `Task type mismatch: uploaded file appears to be ${detectedType} but target is ${type}`,
      });
    }

    // Remove any telegram links or replace all <a> tags with the exit button
    contentHtml = contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Remove watermark/promo texts if present
    contentHtml = contentHtml.replace(/@MINDLESS_WRITER/g, '');

    // Remove any inline confirm() calls
    contentHtml = contentHtml.replace(
      /if\s*\(\s*confirm\s*\([^)]*\)\s*\)\s*/gi,
      '',
    );

    // Inject escape key listener script
    if (!contentHtml.includes('ESCAPE_PRESSED')) {
      contentHtml += IELTS_ESC_LISTENER_SCRIPT;
    }

    const task = await this.prisma.ieltsTask.create({
      data: {
        title: trimmedTitle,
        type,
        contentHtml,
        teacherId,
        groupId,
        ...(groupId
          ? {
              groupTasks: {
                create: {
                  groupId,
                },
              },
            }
          : {}),
      },
    });

    return { id: task.id, title: task.title, type: task.type };
  }

  async getTask(id: string, mode?: string, preview?: boolean, submissionId?: string) {
    const task = await this.prisma.ieltsTask.findUnique({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    // 1. Structure the header cleanly into 3 distinct zones (Left, Center Exit/Badge/Retake, Right Tools)
    task.contentHtml = normalizeIeltsHeader(task.contentHtml, preview, mode === 'review');

    // 2. Also strip any inline confirm() calls anywhere
    task.contentHtml = task.contentHtml.replace(
      /if\s*\(\s*confirm\s*\([^)]*\)\s*\)\s*/gi,
      '',
    );

    // 3. Strip any stray telegram links or legacy exit buttons outside header
    task.contentHtml = task.contentHtml.replace(
      /<a\b[^>]*href=["'][^"']*t\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      '',
    );

    // 3.5. Guard broken or missing listeners from crashing page JS
    task.contentHtml = task.contentHtml.replace(
      /gotoBtn\.addEventListener/g,
      'if (typeof gotoBtn !== "undefined" && gotoBtn) gotoBtn.addEventListener',
    );
    task.contentHtml = task.contentHtml.replace(
      /volumeSlider\.addEventListener/g,
      'if (typeof volumeSlider !== "undefined" && volumeSlider) volumeSlider.addEventListener',
    );

    // 3.6. Ensure initial test synchronization (reset to Part 1 cleanly on take/preview)
    if (mode !== 'review') {
      const syncScript = `<script id="ielts-init-sync">
        (function() {
          function initSync() {
            if (typeof window.switchToPart === 'function') {
              try { window.switchToPart(1); } catch(e) {}
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSync);
          } else {
            setTimeout(initSync, 0);
          }
        })();
      </script>`;
      task.contentHtml = task.contentHtml.replace(
        /<script id=["']ielts-init-sync["']>[\s\S]*?<\/script>/gi,
        '',
      );
      if (task.contentHtml.includes('</body>')) {
        task.contentHtml = task.contentHtml.replace('</body>', `${syncScript}</body>`);
      } else {
        task.contentHtml += syncScript;
      }
    }

    // 4. Inject escape key listener script if not already present
    if (!task.contentHtml.includes('ESCAPE_PRESSED')) {
      task.contentHtml = task.contentHtml.replace('</body>', `${IELTS_ESC_LISTENER_SCRIPT}</body>`);
      if (!task.contentHtml.includes('ESCAPE_PRESSED')) {
        task.contentHtml += IELTS_ESC_LISTENER_SCRIPT;
      }
    }

    // 5. Ensure header fix styles are injected
    task.contentHtml = task.contentHtml.replace(
      /<style id=["']ielts-header-fix["']>[\s\S]*?<\/style>/gi,
      '',
    );
    if (task.contentHtml.includes('</head>')) {
      task.contentHtml = task.contentHtml.replace('</head>', `${IELTS_HEADER_FIX_STYLES}</head>`);
    } else {
      task.contentHtml = IELTS_HEADER_FIX_STYLES + task.contentHtml;
    }

    // 6. Clean up any leftover synthetic scripts if previously cached
    task.contentHtml = task.contentHtml.replace(
      /<script id=["']ielts-tools-runtime["']>[\s\S]*?<\/script>/gi,
      '',
    );

    // 8. Always inject latest submission postMessage hook or review script
    task.contentHtml = task.contentHtml.replace(
      /<script>[\s\S]*?IELTS_TEST_SUBMITTED[\s\S]*?<\/script>/gi,
      '',
    );
    task.contentHtml = task.contentHtml.replace(
      /<script>[\s\S]*?IELTS_REVIEW_MODE[\s\S]*?<\/script>/gi,
      '',
    );

    if (task.type === IeltsTaskType.WRITING) {
      task.contentHtml = task.contentHtml.replace(/body::after\s*\{[\s\S]*?\}/gi, '');
      task.contentHtml = task.contentHtml.replace(/@MINDLESS_WRITER/g, '');

      if (mode === 'review') {
        let submission: any = null;
        if (submissionId) {
          submission = await this.prisma.ieltsSubmission.findUnique({
            where: { id: submissionId },
          });
        }
        if (!submission) {
          submission = await this.prisma.ieltsSubmission.findFirst({
            where: { taskId: id },
            orderBy: { submittedAt: 'desc' },
          });
        }
        task.contentHtml += buildWritingReviewModeScript(submission);
      } else {
        task.contentHtml += IELTS_WRITING_SUBMISSION_SCRIPT;
      }
    } else {
      if (mode === 'review') {
        let submission: any = null;
        if (submissionId) {
          submission = await this.prisma.ieltsSubmission.findUnique({
            where: { id: submissionId },
          });
        }
        if (!submission) {
          submission = await this.prisma.ieltsSubmission.findFirst({
            where: { taskId: id },
            orderBy: { submittedAt: 'desc' },
          });
        }

        if (submission) {
          task.contentHtml += buildReviewModeScript({
            score: submission.score,
            total: submission.total,
            band: submission.band,
            results: Array.isArray(submission.answersJson) ? submission.answersJson : [],
          });
        } else {
          task.contentHtml += IELTS_REVIEW_MODE_SCRIPT;
        }
      } else {
        task.contentHtml += IELTS_SUBMISSION_SCRIPT;
      }
    }

    return task;
  }

  async deleteTask(id: string, user: JwtPayload) {
    const task = await this.prisma.ieltsTask.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    if (user.role === Role.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!teacherProfile || task.teacherId !== teacherProfile.id) {
        throw new ForbiddenException({
          errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
          message: 'You cannot delete this task',
        });
      }
    } else if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException({
        errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'Forbidden',
      });
    }

    await this.prisma.ieltsTask.delete({ where: { id } });
    return { success: true };
  }

  async deleteTasks(ids: string[], user: JwtPayload) {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
    }

    const whereClause: any = {
      id: { in: ids },
    };

    if (user.role === Role.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!teacherProfile) {
        throw new ForbiddenException({
          errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
          message: 'Teacher profile not found',
        });
      }
      whereClause.teacherId = teacherProfile.id;
    } else if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException({
        errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'Forbidden',
      });
    }

    const result = await this.prisma.ieltsTask.deleteMany({
      where: whereClause,
    });

    return { success: true, count: result.count };
  }

  async getTasksByGroup(groupId: string) {
    return this.prisma.ieltsTask.findMany({
      where: {
        OR: [
          { groupTasks: { some: { groupId } } },
          { groupId },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTasksForTeacherUser(userId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacherProfile) {
      return [];
    }
    return this.getTasksByTeacher(teacherProfile.id);
  }

  async getTasksByTeacher(teacherId: string) {
    return this.prisma.ieltsTask.findMany({
      where: { teacherId },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        _count: {
          select: {
            groupTasks: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTasksByStudent(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return [];
    }

    return this.prisma.ieltsTask.findMany({
      where: {
        OR: [
          { groupTasks: { some: { groupId: student.groupId } } },
          { groupId: student.groupId },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTasks() {
    return this.prisma.ieltsTask.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        _count: {
          select: {
            groupTasks: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitTask(user: JwtPayload, taskId: string, dto: { score: number; total?: number; band: number; results: any[] }) {
    const task = await this.prisma.ieltsTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student profile not found',
      });
    }

    let isAssigned = false;
    if (studentProfile.groupId) {
      if (task.groupId === studentProfile.groupId) {
        isAssigned = true;
      } else {
        const count = await this.prisma.groupTask.count({
          where: {
            groupId: studentProfile.groupId,
            taskId,
          },
        });
        isAssigned = count > 0;
      }
    }

    if (!isAssigned) {
      throw new ForbiddenException({
        errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'This task is not assigned to your group',
      });
    }

    const total = dto.total ?? 40;
    const lastSubmission = await this.prisma.ieltsSubmission.findFirst({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      orderBy: { attempt: 'desc' },
    });
    const attempt = lastSubmission ? lastSubmission.attempt + 1 : 1;

    const submission = await this.prisma.ieltsSubmission.create({
      data: {
        studentId: studentProfile.id,
        taskId,
        score: dto.score,
        total,
        band: dto.band,
        attempt,
        answersJson: dto.results,
      },
    });

    return {
      id: submission.id,
      taskId: submission.taskId,
      score: submission.score,
      total: submission.total,
      band: submission.band,
      attempt: submission.attempt,
      submittedAt: submission.submittedAt,
    };
  }

  async getMySubmission(user: JwtPayload, taskId: string) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return null;
    }

    return this.prisma.ieltsSubmission.findFirst({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      orderBy: { attempt: 'desc' },
    });
  }

  async getMySubmissions(user: JwtPayload) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return [];
    }

    return this.prisma.ieltsSubmission.findMany({
      where: { studentId: studentProfile.id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getTaskAttempts(user: JwtPayload, taskId: string) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return [];
    }

    return this.prisma.ieltsSubmission.findMany({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      select: {
        id: true,
        taskId: true,
        score: true,
        total: true,
        band: true,
        attempt: true,
        submittedAt: true,
        answersJson: true,
      },
      orderBy: { attempt: 'asc' },
    });
  }
}
