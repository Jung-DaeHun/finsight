const {Button,IconButton,Icon,Badge,FilterChip,DisclosureRow}=window.FinsightDesignSystem_e79c28;
function Wordmark({onClick,size=24}){return <button type="button" onClick={onClick} className="fs-mark" style={{fontSize:size}}>finsight</button>;}
function PublicHeader({go,user}){
return <header className="fs-head"><Wordmark onClick={()=>go('landing')}/>
<nav className="fs-head-nav"><a onClick={()=>go('landing','features')}>기능</a><a onClick={()=>go('landing','pricing')}>요금제</a><a onClick={()=>go('sample')}>샘플 결과</a></nav>
<div className="fs-head-right">{user?<Button size="sm" onClick={()=>go('dashboard')}>대시보드</Button>:<><button className="fs-textbtn" onClick={()=>go('login')}>로그인</button><Button size="sm" onClick={()=>go('signup')}>무료로 시작하기</Button></>}</div></header>;}
function AppHeader({user,route,go,onLogout}){
return <header className="fs-head fs-head-app"><Wordmark onClick={()=>go('dashboard')}/>
<nav className="fs-head-nav fs-tabs">{[['dashboard','대시보드'],['upload','새 분석'],['settings','설정']].map(([r,l])=><a key={r} className={(route===r||(r==='dashboard'&&route==='result'))?'on':''} onClick={()=>go(r)}>{l}</a>)}</nav>
<div className="fs-head-right"><Badge style={user.plan==='pro'?{background:'var(--ink)',color:'#fff',borderColor:'var(--ink)'}:null}>{user.plan==='pro'?'Pro':'Free'}</Badge><span className="fs-cap fs-hide-sm">{user.email}</span><button className="fs-textbtn" onClick={onLogout}>로그아웃</button></div></header>;}
function SectionHead({title,count,right}){return <div className="fs-sh"><h3>{title}{count!=null&&<span className="fs-muted"> ({count})</span>}</h3>{right}</div>;}
function Delta({cur,prev}){if(!prev)return <span className="fs-cap fs-muted">전월 데이터 없음</span>;const d=(cur/prev-1)*100;return <span className="fs-cap" style={{color:d<0?'var(--success)':'var(--ink)'}}>전월 대비 {d>0?'+':''}{d.toFixed(1)}%</span>;}
function KPI({label,value,sub,big}){return <div className="fs-kpi"><div className="fs-cap fs-muted">{label}</div><div className={big?'fs-num-xl':'fs-num'}>{value}</div>{sub&&<div>{sub}</div>}</div>;}
function CategoryBars({data,active,onPick,showDelta}){
const max=data.cats[0].amt;
return <div className="fs-bars">{data.cats.map(c=><button key={c.name} className={'fs-bar'+(active===c.name?' on':'')+(active&&active!==c.name?' dim':'')} onClick={()=>onPick&&onPick(active===c.name?null:c.name)}>
<span className="fs-bar-l">{c.name}</span><span className="fs-bar-t"><span style={{width:(c.amt/max*100)+'%'}}></span></span><span className="fs-bar-v">{fsWon(c.amt)}</span><span className="fs-bar-p">{(c.pct*100).toFixed(1)}%</span></button>)}</div>;}
function ShareStrip({data}){return <div className="fs-strip">{data.cats.map((c,i)=><span key={c.name} title={c.name+' '+(c.pct*100).toFixed(1)+'%'} style={{flex:c.pct,background:i===0?'var(--ink)':i===1?'var(--charcoal)':i===2?'var(--mute)':i===3?'var(--stone)':'var(--hairline)'}}></span>)}</div>;}
function TopMerchants({data}){return <ol className="fs-list">{data.merchants.map((m,i)=><li key={m.name}><span className="fs-rank">{i+1}</span><span className="fs-grow">{m.name}<span className="fs-cap fs-muted"> · {m.n}건</span></span><span className="fs-amt">{fsWon(m.amt)}</span></li>)}</ol>;}
function TxTable({data,filter,limit,multi}){
const [q,setQ]=React.useState('');const [all,setAll]=React.useState(false);
let rows=data.tx.filter(t=>(!filter||t.cat===filter)&&(!q||t.merchant.includes(q)));
rows=[...rows].sort((a,b)=>a.date<b.date?1:-1);
const shown=limit&&!all?rows.slice(0,limit):rows;
return <div><div className="fs-txbar"><input className="fs-input fs-input-sm" placeholder="가맹점 검색" value={q} onChange={e=>setQ(e.target.value)}/><span className="fs-cap fs-muted">{rows.length}건 · {fsWon(rows.reduce((a,t)=>a+t.amt,0))}</span></div>
<div className="fs-tablewrap"><table className="fs-table"><thead><tr><th>날짜</th><th>가맹점</th><th className="fs-hide-sm">카테고리</th>{multi&&<th className="fs-hide-sm">출처</th>}<th className="r">금액</th></tr></thead>
<tbody>{shown.map(t=><tr key={t.id}><td className="fs-muted">{t.date.replace('-','.')}</td><td>{t.merchant}{t.flag==='dup'&&<span className="fs-flag">중복 의심</span>}<div className="fs-cap fs-muted">{t.desc}</div></td><td className="fs-hide-sm">{t.cat}</td>{multi&&<td className="fs-hide-sm fs-muted">{FS_SOURCES[t.src]}</td>}<td className="r fs-amt">{fsWon(t.amt)}</td></tr>)}</tbody></table></div>
{limit&&rows.length>limit&&<div style={{marginTop:12}}><Button size="sm" variant="secondary" onClick={()=>setAll(!all)}>{all?'접기':'전체 보기 ('+rows.length+')'}</Button></div>}</div>;}
function LockCard({title,desc,teaser,onUpgrade}){return <div className="fs-lock"><div className="fs-lock-ico"><Icon name="lock" size={18}/></div><div className="fs-grow" style={{minWidth:220}}><div className="fs-strong">{title}</div>{teaser&&<div className="fs-num" style={{margin:'4px 0'}}>{teaser}</div>}<p className="fs-cap fs-muted" style={{margin:0}}>{desc}</p></div><Button size="sm" onClick={onUpgrade}>Pro로 업그레이드</Button></div>;}
function RecurringPanel({data,locked,onUpgrade}){
const sum=data.recurring.reduce((a,r)=>a+r.amt,0);
if(locked)return <LockCard title="정기결제" teaser={data.recurring.length+'건 발견'} desc="어떤 구독이 언제 빠져나가는지 상세 목록은 Pro에서 볼 수 있습니다." onUpgrade={onUpgrade}/>;
return <div><div className="fs-cap fs-muted" style={{marginBottom:8}}>{data.recurring.length}건 · 월 {fsWon(sum)}</div><ul className="fs-list">{data.recurring.map(r=><li key={r.m}><span className="fs-grow">{r.m}<div className="fs-cap fs-muted">{r.months}개월 연속 · 다음 결제 {r.next.replace('-','.')}</div></span><span className="fs-amt">{fsWon(r.amt)}</span></li>)}</ul></div>;}
function AnomalyPanel({data,locked,onUpgrade}){
if(locked)return <LockCard title="이상거래" teaser={data.anomalies.length+'건 발견'} desc="중복 결제·급증 내역과 금액은 Pro에서 확인할 수 있습니다." onUpgrade={onUpgrade}/>;
return <ul className="fs-list">{data.anomalies.map(a=><li key={a.title} style={{alignItems:'flex-start'}}><Badge>{a.type}</Badge><span className="fs-grow"><span className="fs-strong">{a.title}</span><div className="fs-cap fs-muted">{a.detail}</div></span></li>)}</ul>;}
function TrendPanel({data,locked,onUpgrade}){
if(locked)return <LockCard title="월별 추이 · 전월 대비" desc="최근 6개월 지출 흐름과 카테고리별 변화를 Pro에서 볼 수 있습니다." onUpgrade={onUpgrade}/>;
const max=Math.max(...data.trend.map(t=>t.amt));
return <div><div className="fs-trend">{data.trend.map((t,i)=>{const last=i===data.trend.length-1;return <div key={t.m} className="fs-tcol"><span className="fs-cap" style={{color:last?'var(--ink)':'var(--mute)'}}>{Math.round(t.amt/10000)}만</span><span className="fs-tbar" style={{height:(t.amt/max*100)+'%',background:last?'var(--ink)':'var(--hairline)'}}></span><span className="fs-cap fs-muted">{t.m}</span></div>;})}</div>
<div className="fs-cap fs-muted" style={{marginTop:12}}>카테고리 변화 (8월 → 9월)</div>
<ul className="fs-list fs-list-tight">{data.cats.filter(c=>c.prev).slice(0,4).map(c=>{const d=(c.amt/c.prev-1)*100;return <li key={c.name}><span className="fs-grow">{c.name}</span><span className="fs-cap fs-muted">{fsWon(c.prev)} → {fsWon(c.amt)}</span><span className="fs-cap" style={{width:56,textAlign:'right',color:d<0?'var(--success)':'var(--ink)'}}>{d>0?'+':''}{d.toFixed(0)}%</span></li>;})}</ul></div>;}
function InsightsPanel({data,locked,onUpgrade,state,onGenerate}){
if(locked)return <LockCard title="AI 인사이트 & 절약 조언" desc="이번 분석을 바탕으로 줄일 수 있는 지출과 예상 절약액을 알려드립니다." onUpgrade={onUpgrade}/>;
if(state==='idle')return <div className="fs-empty"><p className="fs-muted" style={{margin:'0 0 12px'}}>이번 분석 결과로 절약 포인트를 만들어 드립니다.</p><Button size="sm" icon="sparkles" onClick={onGenerate}>인사이트 생성</Button></div>;
if(state==='loading')return <div className="fs-empty"><div className="fs-spin"></div><p className="fs-cap fs-muted">거래 {data.tx.length}건을 살펴보는 중…</p></div>;
const save=data.insights.reduce((a,i)=>a+i.save,0);
return <div><div className="fs-cap fs-muted">예상 절약 가능액</div><div className="fs-num" style={{marginBottom:8}}>월 {fsWon(save)}</div><ol className="fs-ins">{data.insights.map((s,i)=><li key={i}><span className="fs-rank">{i+1}</span><div><div className="fs-strong">{s.h}</div><p className="fs-cap fs-muted" style={{margin:'2px 0 0'}}>{s.b}</p></div></li>)}</ol></div>;}
Object.assign(window,{Wordmark,PublicHeader,AppHeader,SectionHead,Delta,KPI,CategoryBars,ShareStrip,TopMerchants,TxTable,LockCard,RecurringPanel,AnomalyPanel,TrendPanel,InsightsPanel});
