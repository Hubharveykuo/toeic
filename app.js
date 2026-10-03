let db;
let allRows=[];
let todayOnly=false;
let reviewState=null;

const els={
  content:document.getElementById('content'),
  search:document.getElementById('searchInput'),
  article:document.getElementById('articleFilter'),
  importance:document.getElementById('importanceFilter'),
  familiarity:document.getElementById('familiarityFilter'),
  today:document.getElementById('todayFilter'),
  clear:document.getElementById('clearFilters'),
  stats:document.getElementById('stats'),
  review:document.getElementById('reviewPanel')
};

function query(sql,params=[]){
  const stmt=db.prepare(sql);
  stmt.bind(params);
  const rows=[];
  while(stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function esc(v=''){
  return String(v??'').replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

function localDateISO(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function shuffle(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function loadRows(){
  allRows=query(`
    SELECT a.article_key,a.test_name,a.question_range,
           v.position,v.word,v.chinese_meanings,v.part_of_speech,
           v.collocations,v.article_usage,v.importance,v.familiarity,v.added_date
    FROM vocabulary v
    JOIN articles a ON a.id=v.article_id
    ORDER BY a.id,v.position
  `);

  const articles=[...new Set(allRows.map(r=>r.article_key))];
  for(const a of articles){
    const o=document.createElement('option');
    o.value=a;
    o.textContent=a;
    els.article.appendChild(o);
  }
  render();
}

function filteredRows(){
  const q=els.search.value.trim().toLowerCase();
  const today=localDateISO();

  return allRows.filter(r=>{
    if(els.article.value && r.article_key!==els.article.value) return false;
    if(els.importance.value && r.importance!==els.importance.value) return false;
    if(els.familiarity.value && r.familiarity!==els.familiarity.value) return false;
    if(todayOnly && r.added_date!==today) return false;

    if(q){
      const hay=[r.word,r.chinese_meanings,r.part_of_speech,r.collocations,r.article_usage]
        .join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderStats(rows){
  const articles=new Set(rows.map(r=>r.article_key)).size;
  const s=rows.filter(r=>r.importance==='S').length;
  const unfamiliar=rows.filter(r=>r.familiarity==='陌生').length;

  els.stats.innerHTML=`
    <div class="stat"><strong>${rows.length}</strong>單字</div>
    <div class="stat"><strong>${articles}</strong>篇文章</div>
    <div class="stat"><strong>${s}</strong>S 必背</div>
    <div class="stat"><strong>${unfamiliar}</strong>陌生</div>`;
}

function render(){
  const rows=filteredRows();
  renderStats(rows);

  els.today.classList.toggle('active',todayOnly);
  els.today.setAttribute('aria-pressed',String(todayOnly));

  if(!rows.length){
    els.content.innerHTML='<div class="empty">'+
      (todayOnly?'今天尚未新增單字。':'沒有符合條件的單字。')+
      '</div>';
    return;
  }

  const grouped=new Map();
  rows.forEach(r=>{
    if(!grouped.has(r.article_key)) grouped.set(r.article_key,[]);
    grouped.get(r.article_key).push(r);
  });

  els.content.innerHTML=[...grouped.entries()].map(([article,items])=>`
    <section class="article">
      <div class="article-head">
        <div>
          <h2>${esc(article)}</h2>
          <span class="count">${items.length} 個單字</span>
        </div>
        <button class="review-start" type="button" data-article="${esc(article)}">開始複習</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Word</th><th>中文多義</th><th>詞性</th>
              <th>常見搭配</th><th>本文用法</th><th>重要性</th><th>熟悉度</th><th>加入日期</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(r=>`
              <tr>
                <td class="num">${r.position}</td>
                <td class="word">${esc(r.word)}</td>
                <td>${esc(r.chinese_meanings)}</td>
                <td>${esc(r.part_of_speech)}</td>
                <td>${esc(r.collocations)}</td>
                <td>${esc(r.article_usage)}</td>
                <td><span class="tag ${esc(r.importance)}">${esc(r.importance)}</span></td>
                <td><span class="tag fam">${esc(r.familiarity)}</span></td>
                <td>${esc(r.added_date)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`).join('');

  els.content.querySelectorAll('.review-start').forEach(btn=>{
    btn.addEventListener('click',()=>openReview(btn.dataset.article));
  });
}

function articleWords(article){
  return allRows.filter(r=>r.article_key===article).sort((a,b)=>a.position-b.position);
}

function openReview(article){
  reviewState={article,words:articleWords(article),mode:null};
  els.review.hidden=false;
  els.content.hidden=true;
  document.querySelector('.toolbar').hidden=true;
  renderModePicker();
  requestAnimationFrame(()=>{
    els.review.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function closeReview(){
  reviewState=null;
  els.review.hidden=true;
  els.content.hidden=false;
  document.querySelector('.toolbar').hidden=false;
  render();
  requestAnimationFrame(()=>{
    els.content.scrollIntoView({behavior:'smooth',block:'start'});
  });
}

function reviewHeader(extra=''){
  const modeButton=reviewState?.mode
    ? '<button id="backToModes" class="secondary-btn" type="button">選擇模式</button>'
    : '';
  return `
    <div class="review-topbar">
      <div>
        <p class="review-kicker">文章複習</p>
        <h2>${esc(reviewState.article)}</h2>
        ${extra}
      </div>
      <div class="review-actions">
        ${modeButton}
        <button id="exitReview" class="secondary-btn" type="button">返回單字庫</button>
      </div>
    </div>`;
}

function bindExit(){
  document.getElementById('exitReview')?.addEventListener('click',closeReview);
  document.getElementById('backToModes')?.addEventListener('click',()=>{
    reviewState.mode=null;
    renderModePicker();
  });
}

function renderModePicker(){
  els.review.innerHTML=`
    ${reviewHeader('<p class="review-sub">選擇一種方式，快速建立英文 → 中文的反應。</p>')}
    <div class="mode-grid">
      <button class="mode-card" type="button" data-mode="match">
        <strong>英中配對</strong>
        <span>每輪 6 組，找出正確英文與中文。</span>
      </button>
      <button class="mode-card" type="button" data-mode="quiz">
        <strong>英 → 中四選一</strong>
        <span>看到英文，快速選出正確中文。</span>
      </button>
      <button class="mode-card" type="button" data-mode="reverse">
        <strong>中 → 英四選一</strong>
        <span>反向回想，確認是否真的記住。</span>
      </button>
    </div>`;
  bindExit();
  els.review.querySelectorAll('.mode-card').forEach(btn=>{
    btn.addEventListener('click',()=>startMode(btn.dataset.mode));
  });
}

function startMode(mode,sourceWords=null){
  reviewState.mode=mode;
  reviewState.sourceWords=shuffle(sourceWords ? sourceWords : reviewState.words);
  reviewState.index=0;
  reviewState.correct=0;
  reviewState.wrong=[];
  if(mode==='match') startMatch();
  else renderQuizQuestion();
}

function primaryMeaning(row){
  return String(row.chinese_meanings||'').split('；')[0].trim() || row.chinese_meanings;
}

function renderQuizQuestion(){
  const words=reviewState.sourceWords;
  if(reviewState.index>=words.length){
    renderQuizResult();
    return;
  }

  const current=words[reviewState.index];
  const reverse=reviewState.mode==='reverse';
  const pool=reviewState.words.filter(w=>w.word!==current.word);
  const distractors=shuffle(pool).slice(0,3);
  const answers=shuffle([current,...distractors]);

  els.review.innerHTML=`
    ${reviewHeader(`<p class="review-sub">第 ${reviewState.index+1} / ${words.length} 題</p>`)}
    <div class="quiz-card">
      <div class="quiz-progress"><span style="width:${Math.round((reviewState.index/words.length)*100)}%"></span></div>
      <p class="quiz-label">${reverse?'請選出對應英文':'請選出正確中文'}</p>
      <div class="quiz-prompt">${esc(reverse?primaryMeaning(current):current.word)}</div>
      <div class="answer-grid">
        ${answers.map(a=>`
          <button class="answer-btn" type="button" data-word="${esc(a.word)}">
            ${esc(reverse?a.word:primaryMeaning(a))}
          </button>`).join('')}
      </div>
      <div id="quizFeedback" class="quiz-feedback" aria-live="polite"></div>
    </div>`;
  bindExit();

  let answered=false;
  els.review.querySelectorAll('.answer-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(answered) return;
      answered=true;
      const ok=btn.dataset.word===current.word;
      if(ok) reviewState.correct++;
      else reviewState.wrong.push(current);

      els.review.querySelectorAll('.answer-btn').forEach(b=>{
        b.disabled=true;
        if(b.dataset.word===current.word) b.classList.add('correct');
      });
      if(!ok) btn.classList.add('wrong');

      const feedback=document.getElementById('quizFeedback');
      const usage=current.article_usage ? `<div class="feedback-usage"><strong>本文用法：</strong>${esc(current.article_usage)}</div>` : '';
      feedback.innerHTML=ok
        ? `<div><strong>答對了</strong>　${esc(current.word)} = ${esc(current.chinese_meanings)}</div>${usage}`
        : `<div><strong>答錯了</strong>　正確答案：${esc(current.word)} = ${esc(current.chinese_meanings)}</div>${usage}`;

      const next=document.createElement('button');
      next.type='button';
      next.className='next-btn';
      next.textContent=reviewState.index===words.length-1?'查看結果':'下一題';
      next.addEventListener('click',()=>{
        reviewState.index++;
        renderQuizQuestion();
      });
      feedback.appendChild(next);
    });
  });
}

function renderQuizResult(){
  const total=reviewState.sourceWords.length;
  const wrongCount=reviewState.wrong.length;
  const rate=total?Math.round((reviewState.correct/total)*100):0;

  els.review.innerHTML=`
    ${reviewHeader()}
    <div class="result-card">
      <p class="result-label">本輪完成</p>
      <div class="result-score">${reviewState.correct} / ${total}</div>
      <p>正確率 ${rate}%</p>
      ${wrongCount
        ? `<p class="result-note">有 ${wrongCount} 個單字需要再加強。</p>
           <div class="result-actions">
             <button id="retryWrong" type="button">錯題再戰</button>
             <button id="chooseMode" class="secondary-btn" type="button">換模式</button>
           </div>`
        : `<p class="result-note">這一輪全部答對 🎉</p>
           <button id="chooseMode" type="button">再選一個模式</button>`}
    </div>`;
  bindExit();

  document.getElementById('retryWrong')?.addEventListener('click',()=>{
    const wrong=[...reviewState.wrong];
    startMode(reviewState.mode,wrong);
  });
  document.getElementById('chooseMode')?.addEventListener('click',renderModePicker);
}

function startMatch(){
  reviewState.matchOffset=0;
  reviewState.matchScore=0;
  renderMatchBatch();
}

function renderMatchBatch(){
  const all=reviewState.sourceWords;
  const batch=all.slice(reviewState.matchOffset,reviewState.matchOffset+6);

  if(!batch.length){
    els.review.innerHTML=`
      ${reviewHeader()}
      <div class="result-card">
        <p class="result-label">配對完成</p>
        <div class="result-score">${all.length} 個</div>
        <p>這篇文章的配對練習完成。</p>
        <button id="chooseMode" type="button">選擇其他模式</button>
      </div>`;
    bindExit();
    document.getElementById('chooseMode').addEventListener('click',renderModePicker);
    return;
  }

  const chinese=shuffle(batch);
  els.review.innerHTML=`
    ${reviewHeader(`<p class="review-sub">第 ${reviewState.matchOffset+1}–${reviewState.matchOffset+batch.length} / ${all.length} 個</p>`)}
    <div class="match-card">
      <p class="quiz-label">先點英文，再點對應中文</p>
      <div class="match-grid">
        <div class="match-column">
          ${batch.map(w=>`<button class="match-btn en" type="button" data-word="${esc(w.word)}">${esc(w.word)}</button>`).join('')}
        </div>
        <div class="match-column">
          ${chinese.map(w=>`<button class="match-btn zh" type="button" data-word="${esc(w.word)}">${esc(primaryMeaning(w))}</button>`).join('')}
        </div>
      </div>
      <div id="matchFeedback" class="quiz-feedback" aria-live="polite"></div>
    </div>`;
  bindExit();

  let selected=null;
  let matched=0;
  const enButtons=[...els.review.querySelectorAll('.match-btn.en')];
  const zhButtons=[...els.review.querySelectorAll('.match-btn.zh')];

  enButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.disabled) return;
      enButtons.forEach(b=>b.classList.remove('selected'));
      selected=btn.dataset.word;
      btn.classList.add('selected');
      document.getElementById('matchFeedback').textContent='已選：'+btn.textContent;
    });
  });

  zhButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.disabled || !selected) return;
      const feedback=document.getElementById('matchFeedback');
      if(btn.dataset.word===selected){
        const en=enButtons.find(b=>b.dataset.word===selected);
        en.disabled=true;
        btn.disabled=true;
        en.classList.remove('selected');
        en.classList.add('matched');
        btn.classList.add('matched');
        feedback.textContent='配對成功';
        selected=null;
        matched++;

        if(matched===batch.length){
          const next=document.createElement('button');
          next.type='button';
          next.className='next-btn';
          next.textContent=reviewState.matchOffset+batch.length>=all.length?'完成':'下一輪 6 組';
          next.addEventListener('click',()=>{
            reviewState.matchOffset+=batch.length;
            renderMatchBatch();
          });
          feedback.appendChild(next);
        }
      }else{
        btn.classList.add('wrong');
        feedback.textContent='不對，再試一次';
        setTimeout(()=>btn.classList.remove('wrong'),350);
      }
    });
  });
}

['input','change'].forEach(evt=>{
  els.search.addEventListener(evt,render);
  els.article.addEventListener(evt,render);
  els.importance.addEventListener(evt,render);
  els.familiarity.addEventListener(evt,render);
});

els.today.addEventListener('click',()=>{
  todayOnly=!todayOnly;
  render();
});

els.clear.addEventListener('click',()=>{
  els.search.value='';
  els.article.value='';
  els.importance.value='';
  els.familiarity.value='';
  todayOnly=false;
  render();
});

(async()=>{
  try{
    const SQL=await initSqlJs({
      locateFile:f=>`https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}`
    });
    db=new SQL.Database();

    const seed=await fetch('./data/seed.sql?v=4').then(r=>{
      if(!r.ok) throw new Error('無法讀取 data/seed.sql');
      return r.text();
    });

    db.run(seed);
    loadRows();
  }catch(err){
    console.error(err);
    els.content.innerHTML='<div class="empty">載入失敗：'+esc(err.message)+'</div>';
  }
})();
