/* ═══════════════ Curated puzzle content — single source of truth ═══════════════
   Loaded by puzzles_curated.html (renders it), map-editor.html and maps.html
   (derive the interactables list from it). Every chunk labeled here shows up
   1:1 in the editor's INTERACTABLE dropdown and the game's panel — add or
   remove a chunk below and all three pages pick it up automatically. */

/* ───────────────── Puzzle content ───────────────── */
const TV_HTML=`
  <div class="tv"><div class="tv-screen">
    <div class="tv-title">─── MORSE CODE REFERENCE ───</div>
    <div class="tv-legend">
      <div>DOT  ( . )  =  short blink</div>
      <div>DASH ( - )  =  long blink  (3× dot)</div>
      <div>short gap between symbols in a digit</div>
      <div>long gap between digits</div>
    </div>
    <hr>
    <table class="tv-table"><tr>
      <td class="d">DIGIT</td><td class="d">MORSE</td><td style="width:40px"></td><td class="d">DIGIT</td><td class="d">MORSE</td></tr>
      <tr><td>0:</td><td>-----</td><td></td><td>5:</td><td>.....</td></tr>
      <tr><td>1:</td><td>.----</td><td></td><td>6:</td><td>-....</td></tr>
      <tr><td>2:</td><td>..---</td><td></td><td>7:</td><td>--...</td></tr>
      <tr><td>3:</td><td>...--</td><td></td><td>8:</td><td>---..</td></tr>
      <tr><td>4:</td><td>....-</td><td></td><td>9:</td><td>----.</td></tr>
    </table>
  </div></div>`;

const PUZZLES = [
  {
    num:'1', name:'عائلتنا الكريمة', loc:'At the Gate', build:'tree',
    given:`
      <div class="chunk"><span class="clabel">p1g1</span>
        <div class="clue arabic">
          <div class="head">عبدالرحمن يقول:</div>
          • الاكبر الى الاصغر من اليسار لي اليمين<br>
          • ابوي عنده 3 اولاد، انا واخواني<br>
          • اكبرنا بوغازي ودايما يقول "طول عمري وانا يسموني بوغازي، عيب ما اسمي ولدي غازي"<br>
          • يحليلهم عيسى ومشاري كانو دايما يقلدون اخوهم الكبير<br>
          • لما انولد اخو رزان جا ابوي حق اصغر عيال بوغازي وقال له "مبروك بوعويس جانا السمي"<br>
          • واخر شي لا تنسى سميك
        </div>
      </div>`,
    problem:`<div class="chunk"><span class="clabel">p1p1</span><div class="tree-stage" id="treeStage"></div></div>`,
  },
  {
    num:'2', name:'أمام أعين الجميع', loc:'Study Door · Lock 1', build:'windows',
    given:`
      <div class="chunk"><span class="clabel">p2g2</span>
        <div class="clue arabic">
          <div class="head">ملاحظة ملزوقة يم الشباك:</div>
          اليهال لزقوا ملصقات على قزاز الشباك...<br>
          كل ما ازحلق الشباك، الملصقات تركب على بيوت الفريج!<br>
          يمكن لو ركبت صح، يبين لك شي ينقرا.
        </div>
      </div>`,
    problem:`<div class="chunk"><span class="clabel">p2g1</span>
        <p class="play-hint"><b>Drag</b> the sliding pane (or use the buttons / arrow keys) until the stickers line up with the houses outside.</p>
        <div class="slide-wrap">
          <canvas id="slideWin" width="720" height="430" tabindex="0"></canvas>
          <div class="slide-controls">
            <button class="reveal-btn" id="slideLeft">◀</button>
            <button class="reveal-btn" id="slideRight">▶</button>
            <button class="reveal-btn" id="slideReset">↺ RESET</button>
          </div>
        </div>
      </div>`,
  },
  {
    num:'3', name:'الذكية', loc:'Study Door · Lock 2', build:'clothes',
    given:`
      <div class="chunk"><span class="clabel">p3g1</span>
        <div style="
          background: linear-gradient(160deg, #fdf6e3, #f5ead0);
          border: 1.5px solid #c8a96a;
          border-radius: 6px;
          padding: 28px 32px;
          margin: 0 0 22px 0;
          font-family: 'Amiri', 'Scheherazade New', serif;
          font-size: 1.15rem;
          line-height: 2;
          color: #3a2a10;
          direction: rtl;
          text-align: right;
          box-shadow: 2px 4px 18px rgba(0,0,0,0.13), inset 0 0 40px rgba(200,170,100,0.08);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 10px; left: 10px; right: 10px; bottom: 10px;
            border: 0.5px solid rgba(180,140,60,0.25);
            border-radius: 4px;
            pointer-events: none;
          "></div>
          عزيزه ذكيه و تحب شي اسمه الغاز.<br>
          طاحت على شي يديد اسمه morse code<br>
          وهالايام قامت تفنتق بالاماكن الي تحطلنا فيها الالغاز.<br>
          بس لو تشوف شغلها شغل البيت احسن.
        </div>
      </div>
      <div class="chunk"><span class="clabel">p3g2</span>
        <div class="clothes-wrap"><canvas id="clothesCanvas" width="720" height="300"></canvas></div>
      </div>
      <div class="chunk"><span class="clabel">p3g3</span>
        ${TV_HTML}
      </div>`,
    problem:``,
  },
  {
    num:'4', name:'لعب جهال', loc:'The Courtyard', build:'courtyard',
    given:`
      <div class="chunk"><span class="clabel">p4g1</span>
        <div class="clue arabic" style="direction:rtl;text-align:right;font-size:1.1rem;line-height:2;">
          اليهال يموتون على الحوش في البيت،<br>
          دايما يلعبون هني، بس اشوفهم<br>
          يلفون لفتبن حول الماي ويختفون،<br>
          مادري وين يروحون
        </div>
      </div>`,
    problem:`<div class="chunk"><span class="clabel">p4p1</span>
        <div class="courtyard-wrap">
          <canvas id="courtyardCanvas" width="520" height="520" tabindex="0"></canvas>
          <button class="reveal-btn" id="courtyardReset">↺ RESET</button>
        </div>
      </div>`,
  },
  {
    num:'5', name:'خيال الاطفال مفتاح الثروة', loc:'The Basement', incomplete:false, build:'puzzle5',
    given:`
      <div class="chunk"><span class="clabel">p5g3</span>
        <div class="shapes-grid">
          <div class="shape-item">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,30 40,160 160,160" fill="#6784B8" stroke="none" opacity="0.9"/>
            </svg>
            <div class="shape-label">Triangle</div>
          </div>
          <div class="shape-item">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,25 175,75 150,160 50,160 25,75" fill="#C8758C" stroke="none" opacity="0.9"/>
            </svg>
            <div class="shape-label">Pentagon</div>
          </div>
          <div class="shape-item">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,20 120,85 185,100 120,115 100,180 80,115 15,100 80,85" fill="#BA8858" stroke="none" opacity="0.9"/>
            </svg>
            <div class="shape-label">Four-Pointed Star</div>
          </div>
          <div class="shape-item">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="75" fill="#5D7C48" stroke="none" opacity="0.9"/>
            </svg>
            <div class="shape-label">Circle</div>
          </div>
          <div class="shape-item">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,15 130,70 185,100 130,130 100,185 70,130 15,100 70,70" fill="#942850" stroke="none" opacity="0.9"/>
            </svg>
            <div class="shape-label">Eight-Pointed Star</div>
          </div>
        </div>
      </div>
      <div class="chunk"><span class="clabel">p5g1</span>
        <div class="circles-wrap">
          <canvas id="circlesCanvas" width="600" height="440"></canvas>
        </div>
      </div>`,
    problem:`<div class="chunk"><span class="clabel">p5p1</span>
        <p class="arabic" style="font-size:22px; line-height:2;">خيال الاطفال هو مفتاح الثروة</p>
        <div class="shape-lock" id="shapeLock">
          <div class="lock-row"><div class="position">1:</div><div id="row0"></div></div>
          <div class="lock-row"><div class="position">2:</div><div id="row1"></div></div>
          <div class="lock-row"><div class="position">3:</div><div id="row2"></div></div>
          <div class="lock-row"><div class="position">4:</div><div id="row3"></div></div>
          <div class="lock-row"><div class="position">5:</div><div id="row4"></div></div>
          <div class="lock-status" id="lockStatus"></div>
        </div>
      </div>`,
  },
  {
    num:'6', name:'شهر عسل 89', loc:'Beyond the Basement', build:'puzzle6',
    given:`
      <div class="chunk"><span class="clabel">p6g1</span>
        <div style="
          background: linear-gradient(160deg, #fdf6e3, #f5ead0);
          border: 1.5px solid #c8a96a;
          border-radius: 6px;
          padding: 28px 32px;
          margin: 18px 0;
          font-family: 'Amiri', 'Scheherazade New', serif;
          font-size: 1.18rem;
          line-height: 2;
          color: #3a2a10;
          direction: rtl;
          text-align: right;
          box-shadow: 2px 4px 18px rgba(0,0,0,0.13), inset 0 0 40px rgba(200,170,100,0.08);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 10px; left: 10px; right: 10px; bottom: 10px;
            border: 0.5px solid rgba(180,140,60,0.25);
            border-radius: 4px;
            pointer-events: none;
          "></div>
          كان اجمل شهر مع اجمل رسامة<br>
          قضينا يومين في صحراء افريقيا وشفنا العجب<br>
          صعدنا جبل وبحياتي ما شفت النجوم جذي!<br>
          رحنا جزيرة هناك عرفت معنى الهدوء<br>
          زرنا قرى بالبرتقال وكلينا طباخهم قبل لا نروح غابات اسبانيا<br>
          ختمنا احلى شهر باحلى شروق
        </div>
      </div>`,
    problem:`<div class="chunk"><span class="clabel">p6p1</span>
        <div id="p6grid" style="margin:20px 0;"></div>
        <button class="reveal-btn" id="p6reset" style="margin-top:8px;">↺ RESET</button>
      </div>`,
  },
  {
    num:'7', name:'عزيزين على القلب', loc:'Beyond شهر عسل 89', build:'puzzle7',
    given:`
      <div class="chunk"><span class="clabel">p7g1</span></div>
      <div class="chunk"><span class="clabel">p7g2</span></div>`,
    problem:`<div class="chunk"><span class="clabel">p7p1</span>
        <div id="p7grid" style="margin:20px 0;"></div>
        <button class="reveal-btn" id="p7reset" style="margin-top:8px;">↺ RESET</button>
      </div>`,
  },
];

/* Every chunk on the curated page, in page order — the shared interactables
   list. The game shows a chunk by loading puzzles_curated.html?chunk=<id>,
   so edits to the chunks above appear in-game with no other changes. */
const PUZZLE_CHUNKS = PUZZLES.flatMap(p =>
  [...((p.given || '') + (p.problem || '')).matchAll(/class="clabel">([^<]+)</g)]
    .map(m => ({ id: m[1], puzzle: +p.num })));
