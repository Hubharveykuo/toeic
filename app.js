let db;
let allRows=[];

const els={
  content:document.getElementById('content'),
  search:document.getElementById('searchInput'),
  article:document.getElementById('articleFilter'),
  importance:document.getElementById('importanceFilter'),
  familiarity:document.getElementById('familiarityFilter'),
  clear:document.getElementById('clearFilters'),
  stats:document.getElementById('stats')
};

function query(sql,params=[]){
  const stmt=db.prepare(sql); stmt.bind(params);
  const rows=[]; while(stmt.step()) rows.push(stmt.getAsObject());
  stmt.free(); return rows;
}

function esc(v=''){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

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
  for(const a of articles){const o=document.createElement('option');o.value=a;o.textContent=a;els.article.appendChild(o);}
  render();
}

function filteredRows(){
  const q=els.search.value.trim().toLowerCase();
  return allRows.filter(r=>{
    if(els.article.value && r.article_key!==els.article.value) return false;
    if(els.importance.value && r.importance!==els.importance.value) return false;
    if(els.familiarity.value && r.familiarity!==els.familiarity.value) return false;
    if(q){
      const hay=[r.word,r.chinese_meanings,r.part_of_speech,r.collocations,r.article_usage].join(' ').toLowerCase();
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
  const rows=filteredRows(); renderStats(rows);
  if(!rows.length){els.content.innerHTML='<div class="empty">沒有符合條件的單字。</div>';return;}
  const grouped=new Map();
  rows.forEach(r=>{if(!grouped.has(r.article_key)) grouped.set(r.article_key,[]);grouped.get(r.article_key).push(r);});
  els.content.innerHTML=[...grouped.entries()].map(([article,items])=>`
    <section class="article">
      <div class="article-head"><h2>${esc(article)}</h2><span class="count">${items.length} 個單字</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Word</th><th>中文多義</th><th>詞性</th><th>常見搭配</th><th>本文用法</th><th>重要性</th><th>熟悉度</th><th>加入日期</th>
          </tr></thead>
          <tbody>${items.map(r=>`
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
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </section>`).join('');
}

['input','change'].forEach(evt=>{els.search.addEventListener(evt,render);els.article.addEventListener(evt,render);els.importance.addEventListener(evt,render);els.familiarity.addEventListener(evt,render);});
els.clear.addEventListener('click',()=>{els.search.value='';els.article.value='';els.importance.value='';els.familiarity.value='';render();});

(async()=>{
  try{
    const SQL=await initSqlJs({locateFile:f=>`https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}`});
    db=new SQL.Database();
    const seed=await fetch('./data/seed.sql').then(r=>{if(!r.ok) throw new Error('無法讀取 data/seed.sql');return r.text();});
    db.run(seed); loadRows();
  }catch(err){
    console.error(err);
    els.content.innerHTML='<div class="empty">載入失敗：'+esc(err.message)+'</div>';
  }
})();
