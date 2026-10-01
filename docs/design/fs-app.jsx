const FS_EXAMPLES=[
{name:FS_FILES.card,size:182400,src:'card'},{name:FS_FILES.bank,size:24100,src:'bank'},{name:FS_FILES.card2,size:96800,src:'card2'},
{name:'삼성카드_이용내역_202609.xlsx',size:71000,err:'pw'},{name:'Visa_statement_USD.csv',size:18000,err:'fx'},{name:'신한카드_이용내역_202608.xlsx',size:176000,err:'dup'},{name:'토스뱅크_전체내역_2026.xlsx',size:1480000}];
const FS_ERR={pw:'암호가 걸린 파일입니다. 엑셀에서 열고 [파일 → 정보 → 통합 문서 보호 → 암호 설정]에서 암호를 지운 뒤 다시 저장해 올려 주세요.',fx:'원화(KRW) 금액 열이 없는 외화 명세서는 분석할 수 없습니다. 원화 환산 금액이 포함된 명세서를 받아 주세요.',dup:'같은 내용의 파일을 이미 분석했습니다. 기존 분석은 대시보드에서 볼 수 있습니다.',size:'1MB를 넘는 파일입니다. 기간을 나눠 다시 내려받아 주세요.',ext:'CSV, xlsx, xls 파일만 올릴 수 있습니다.',rows:'시트가 1,200행을 넘습니다.'};
function kb(n){return n>1048576?(n/1048576).toFixed(1)+'MB':Math.round(n/1024)+'KB';}
function PageTitle({title,sub,right}){return <div className="fs-ptitle"><div><h1 className="fs-h1">{title}</h1>{sub&&<div className="fs-muted">{sub}</div>}</div>{right}</div>;}
function UsageMeter({user}){const lim=user.plan==='pro'?50:5;return <div className="fs-usage"><span className="fs-cap fs-muted">이번 달 분석</span><span className="fs-strong">{user.used} / {lim}회</span><span className="fs-meter"><span style={{width:Math.min(100,user.used/lim*100)+'%'}}></span></span></div>;}
function Dashboard({user,analyses,go,open,pending}){
return <div className="fs-wrap fs-page">{pending&&<div className="fs-pending"><div className="fs-spin"></div><div><div className="fs-strong">결제 확인 중</div><div className="fs-cap fs-muted">Polar에서 결제 완료 알림을 받는 중입니다. 확인되면 자동으로 새로고침됩니다.</div></div></div>}
<PageTitle title="대시보드" right={<div className="fs-row"><UsageMeter user={user}/><Button icon="plus" onClick={()=>go('upload')}>새 분석</Button></div>}/>
{analyses.length===0?<div className="fs-emptybig"><h2 className="fs-h2">첫 명세서를 올려 보세요</h2><p className="fs-muted">카드사·은행 앱에서 받은 CSV나 엑셀 파일이면 됩니다. 파일이 없다면 샘플 결과로 먼저 둘러보세요.</p><div className="fs-row" style={{justifyContent:'center'}}><Button onClick={()=>go('upload')}>파일 올리기</Button><Button variant="secondary" onClick={()=>go('sample')}>샘플 결과 체험</Button></div></div>:
<div><SectionHead title="내 분석" count={analyses.length}/><div className="fs-alist">{analyses.map(a=>{const d=fsBuild(a.srcs);return <button key={a.id} className="fs-arow" onClick={()=>open(a.id)}><div className="fs-grow"><div className="fs-strong">{a.title}</div><div className="fs-cap fs-muted">{a.files.join(' · ')}</div></div><div className="fs-hide-sm fs-cap fs-muted">{a.created}</div><div className="fs-amt fs-strong">{fsWon(d.total)}</div><Icon name="chevron-right" size={20}/></button>;})}</div>
{user.plan==='free'&&<div style={{marginTop:24}}><LockCard title="카드·계좌 여러 개를 한 번에" desc="Pro는 분석당 파일 3개까지 합쳐 전체 지출과 월별 추이를 보여줍니다." onUpgrade={()=>go('checkout')}/></div>}</div>}</div>;}
function Upload({user,analyses,go,onStart}){
const pro=user.plan==='pro',max=pro?3:1,lim=pro?50:5;
const [files,setFiles]=React.useState([]);const [msg,setMsg]=React.useState(null);const [drag,setDrag]=React.useState(false);const ref=React.useRef();
const add=f=>{setMsg(null);const ext=f.name.split('.').pop().toLowerCase();
if(!['csv','xlsx','xls'].includes(ext))return setMsg({f:f.name,t:FS_ERR.ext});
if(f.size>1048576)return setMsg({f:f.name,t:FS_ERR.size});
if(f.err)return setMsg({f:f.name,t:FS_ERR[f.err]});
if(files.some(x=>x.name===f.name))return;
if(files.length>=max)return setMsg({f:f.name,t:pro?'분석당 파일은 최대 3개입니다.':'Free는 분석당 파일 1개까지입니다. Pro는 카드·계좌 3개를 합쳐 분석할 수 있습니다.',up:!pro});
const used=files.map(x=>x.src);const src=f.src&&!used.includes(f.src)?f.src:['card','bank','card2'].find(s=>!used.includes(s));
setFiles([...files,{name:f.name,size:f.size,src}]);};
const onPick=e=>{[...e.target.files].forEach(add);e.target.value='';};
const over=user.used>=lim;
return <div className="fs-wrap fs-page fs-narrow"><PageTitle title="새 분석" sub={pro?'파일 최대 3개 · 여러 카드·계좌를 합쳐 분석':'파일 1개 · Pro는 최대 3개'} right={<UsageMeter user={user}/>}/>
<div className={'fs-drop'+(drag?' on':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);[...e.dataTransfer.files].forEach(add);}} onClick={()=>ref.current.click()}>
<Icon name="upload" size={28}/><div className="fs-strong">파일을 끌어다 놓거나 클릭해서 선택</div><div className="fs-cap fs-muted">CSV · xlsx · xls(HTML 표 포함) · UTF-8/EUC-KR · 파일당 1MB, 시트 1,200행까지</div><input ref={ref} type="file" accept=".csv,.xlsx,.xls" multiple hidden onChange={onPick}/></div>
{msg&&<div className="fs-msg"><Icon name="alert-circle" size={18}/><div className="fs-grow"><div className="fs-strong">{msg.f}</div><div className="fs-cap">{msg.t}</div></div>{msg.up&&<Button size="sm" onClick={()=>go('checkout')}>Pro로 업그레이드</Button>}</div>}
{files.length>0&&<ul className="fs-files">{files.map(f=><li key={f.name}><Icon name="file-spreadsheet" size={20}/><span className="fs-grow">{f.name}<span className="fs-cap fs-muted"> · {kb(f.size)}</span></span><IconButton icon="x" label="제거" variant="ghost" size={36} onClick={()=>setFiles(files.filter(x=>x!==f))}/></li>)}</ul>}
<div className="fs-examples"><div className="fs-cap fs-muted">예시 파일로 해보기</div><div className="fs-chips">{FS_EXAMPLES.map(f=><FilterChip key={f.name} onClick={()=>add(f)} style={{height:32,font:'var(--type-caption-md)',padding:'4px 12px'}}>{f.name}</FilterChip>)}</div></div>
<div className="fs-upfoot"><p className="fs-cap fs-muted"><Icon name="lock" size={14} style={{verticalAlign:-2}}/> 올린 원본 파일은 본인만 접근할 수 있는 비공개 스토리지에 저장됩니다. 설정에서 분석을 삭제하거나 탈퇴하면 함께 삭제됩니다.</p>
{over?<Button disabled>이번 달 분석 횟수를 모두 사용했습니다</Button>:<Button disabled={!files.length} onClick={()=>onStart(files)}>분석 시작{files.length>1?' ('+files.length+'개 파일)':''}</Button>}</div></div>;}
function Analyzing({files,onDone}){
const steps=['파일 읽는 중','열 구조 파악 (날짜 · 금액 · 가맹점)','거래 분류 중','정기결제 · 이상거래 탐지','요약 만드는 중'];
const [i,setI]=React.useState(0);
React.useEffect(()=>{if(i>=steps.length){const t=setTimeout(onDone,400);return()=>clearTimeout(t);}const t=setTimeout(()=>setI(i+1),900+files.length*250);return()=>clearTimeout(t);},[i]);
return <div className="fs-wrap fs-page fs-narrow fs-analyzing"><div className="fs-spin fs-spin-lg"></div><h1 className="fs-h2">명세서를 분석하고 있습니다</h1><p className="fs-muted">{files.map(f=>f.name).join(', ')}</p>
<ol className="fs-progress">{steps.map((s,k)=><li key={s} className={k<i?'done':k===i?'now':''}><span className="fs-pdot">{k<i?<Icon name="check" size={14}/>:null}</span>{s}</li>)}</ol><p className="fs-cap fs-muted">창을 닫지 마세요. 파일 3개 기준 최대 4분까지 걸릴 수 있습니다.</p></div>;}
function ResultHeader({a,data,sample,go,pro}){
return <div className="fs-rhead"><div className="fs-cap fs-muted">{sample?<a onClick={()=>go('landing')}>홈</a>:<a onClick={()=>go('dashboard')}>대시보드</a>} / {a.title}</div>
<div className="fs-ptitle" style={{marginTop:8}}><div><h1 className="fs-h1">{a.title} 지출</h1><div className="fs-chips" style={{marginTop:8}}>{a.files.map(f=><Badge key={f}><Icon name="file-spreadsheet" size={12} style={{marginRight:6}}/>{f}</Badge>)}</div></div>
<div className="fs-cap fs-muted">{a.created} 분석 · 거래 {data.tx.length}건</div></div></div>;}
function LayoutReport(p){const {data,pro,up,ins,gen,filter,setFilter}=p;
return <div className="fs-stack"><div className="fs-hero-kpi"><KPI big label="총지출" value={fsWon(data.total)} sub={pro?<Delta cur={data.total} prev={data.prev}/>:null}/><div className="fs-kpirow"><KPI label="거래 건수" value={data.tx.length+'건'}/><KPI label="일평균" value={fsWon(data.total/30)}/><KPI label="가장 큰 카테고리" value={data.cats[0].name} sub={<span className="fs-cap fs-muted">{(data.cats[0].pct*100).toFixed(1)}%</span>}/></div><ShareStrip data={data}/></div>
<div className="fs-g2"><section><SectionHead title="카테고리별 지출"/><CategoryBars data={data} active={filter} onPick={setFilter}/></section><section><SectionHead title="상위 가맹점"/><TopMerchants data={data}/></section></div>
<div className="fs-g2"><section><SectionHead title="정기결제"/><RecurringPanel data={data} locked={!pro} onUpgrade={up}/></section><section><SectionHead title="이상거래"/><AnomalyPanel data={data} locked={!pro} onUpgrade={up}/></section></div>
<div className="fs-g2"><section><SectionHead title="월별 추이"/><TrendPanel data={data} locked={!pro} onUpgrade={up}/></section><section><SectionHead title="AI 인사이트"/><InsightsPanel data={data} locked={!pro} onUpgrade={up} state={ins} onGenerate={gen}/></section></div>
<section><SectionHead title={filter?'거래 내역 · '+filter:'거래 내역'} right={filter&&<button className="fs-textbtn fs-cap" onClick={()=>setFilter(null)}>필터 해제</button>}/><TxTable data={data} filter={filter} limit={12} multi={data.srcs.length>1}/></section></div>;}
function LayoutSplit(p){const {data,pro,up,ins,gen,filter,setFilter}=p;const [tab,setTab]=React.useState('tx');
const tabs=[['tx','거래 내역'],['detect','정기결제 · 이상거래'],['trend','월별 추이'],['ins','AI 인사이트']];
return <div className="fs-split"><aside className="fs-aside"><KPI big label="총지출" value={fsWon(data.total)} sub={pro?<Delta cur={data.total} prev={data.prev}/>:null}/><ShareStrip data={data}/><div className="fs-cap fs-muted" style={{margin:'16px 0 4px'}}>카테고리 · 눌러서 필터</div><CategoryBars data={data} active={filter} onPick={f=>{setFilter(f);setTab('tx');}}/><div className="fs-cap fs-muted" style={{margin:'20px 0 4px'}}>상위 가맹점</div><TopMerchants data={data}/></aside>
<div className="fs-main"><div className="fs-chips" style={{marginBottom:20}}>{tabs.map(([k,l])=><FilterChip key={k} active={tab===k} onClick={()=>setTab(k)}>{l}{!pro&&k!=='tx'&&<Icon name="lock" size={14}/>}</FilterChip>)}</div>
{tab==='tx'&&<section><SectionHead title={filter?'거래 내역 · '+filter:'거래 내역'} right={filter&&<button className="fs-textbtn fs-cap" onClick={()=>setFilter(null)}>필터 해제</button>}/><TxTable data={data} filter={filter} multi={data.srcs.length>1}/></section>}
{tab==='detect'&&<div className="fs-stack"><section><SectionHead title="정기결제"/><RecurringPanel data={data} locked={!pro} onUpgrade={up}/></section><section><SectionHead title="이상거래"/><AnomalyPanel data={data} locked={!pro} onUpgrade={up}/></section></div>}
{tab==='trend'&&<section><SectionHead title="월별 추이"/><TrendPanel data={data} locked={!pro} onUpgrade={up}/></section>}
{tab==='ins'&&<section><SectionHead title="AI 인사이트"/><InsightsPanel data={data} locked={!pro} onUpgrade={up} state={ins} onGenerate={gen}/></section>}</div></div>;}
function LayoutGrid(p){const {data,pro,up,ins,gen,filter,setFilter}=p;const rs=data.recurring.reduce((a,r)=>a+r.amt,0);
return <div className="fs-grid"><div className="fs-tile"><KPI label="총지출" value={fsWon(data.total)} sub={pro?<Delta cur={data.total} prev={data.prev}/>:<span className="fs-cap fs-muted">{data.tx.length}건</span>}/></div><div className="fs-tile"><KPI label="일평균" value={fsWon(data.total/30)}/></div><div className="fs-tile"><KPI label="정기결제" value={data.recurring.length+'건'} sub={<span className="fs-cap fs-muted">{pro?'월 '+fsWon(rs):'상세는 Pro'}</span>}/></div><div className="fs-tile"><KPI label="이상거래" value={data.anomalies.length+'건'} sub={<span className="fs-cap fs-muted">{pro?'중복 1 · 급증 '+(data.anomalies.length-1):'상세는 Pro'}</span>}/></div>
<section className="fs-c2"><SectionHead title="카테고리별 지출"/><ShareStrip data={data}/><div style={{height:12}}></div><CategoryBars data={data} active={filter} onPick={setFilter}/></section><section><SectionHead title="상위 가맹점"/><TopMerchants data={data}/></section>
<section className="fs-c2"><SectionHead title="월별 추이"/><TrendPanel data={data} locked={!pro} onUpgrade={up}/></section><section><SectionHead title="AI 인사이트"/><InsightsPanel data={data} locked={!pro} onUpgrade={up} state={ins} onGenerate={gen}/></section>
{pro&&<><section className="fs-c2"><SectionHead title="정기결제"/><RecurringPanel data={data}/></section><section><SectionHead title="이상거래"/><AnomalyPanel data={data}/></section></>}
<section className="fs-c3"><SectionHead title={filter?'거래 내역 · '+filter:'거래 내역'} right={filter&&<button className="fs-textbtn fs-cap" onClick={()=>setFilter(null)}>필터 해제</button>}/><TxTable data={data} filter={filter} limit={10} multi={data.srcs.length>1}/></section></div>;}
function Result({a,pro,go,layout,sample,ins,onGenerate}){
const data=React.useMemo(()=>fsBuild(a.srcs),[a.id]);const [filter,setFilter]=React.useState(null);
const L=layout==='split'?LayoutSplit:layout==='grid'?LayoutGrid:LayoutReport;
return <div className="fs-wrap fs-page">{sample&&<div className="fs-samplebar"><span><b>샘플 결과</b> · 실제 명세서 예시로 만든 결과입니다. Pro 기능까지 모두 보여드립니다.</span><Button size="sm" variant="on-image" onClick={()=>go('signup')}>무료로 시작하기</Button></div>}
<ResultHeader a={a} data={data} sample={sample} go={go} pro={pro}/><L data={data} pro={pro} up={()=>go('checkout')} ins={ins} gen={onGenerate} filter={filter} setFilter={setFilter}/></div>;}
function Checkout({go,onPaid,user}){const [busy,setBusy]=React.useState(false);
return <div className="fs-polar"><div className="fs-polar-top"><span className="fs-cap fs-muted">checkout.polar.sh · 테스트 모드</span><button className="fs-textbtn fs-cap" onClick={()=>go('dashboard')}>취소하고 돌아가기</button></div>
<div className="fs-polar-body"><div><div className="fs-cap fs-muted">finsight</div><h1 className="fs-h2" style={{margin:'4px 0'}}>FinSight Pro</h1><div className="fs-num-xl">$9<span className="fs-cap"> / 월</span></div><ul className="fs-list fs-list-tight">{['분석당 파일 최대 3개','정기결제 · 이상거래 상세','월별 추이 · 전월 대비','AI 인사이트 & 절약 조언','월 50회 분석'].map(x=><li key={x}><Icon name="check" size={16}/><span className="fs-grow">{x}</span></li>)}</ul></div>
<div className="fs-polar-form"><Field label="이메일" value={user.email} onChange={()=>{}}/><Field label="카드 번호" value="4242 4242 4242 4242" onChange={()=>{}}/><div className="fs-g2" style={{gap:12}}><Field label="만료일" value="12 / 28" onChange={()=>{}}/><Field label="CVC" value="123" onChange={()=>{}}/></div>
<Button fullWidth disabled={busy} onClick={()=>{setBusy(true);setTimeout(onPaid,1200);}}>{busy?'처리 중…':'$9 구독하기'}</Button><p className="fs-cap fs-muted">언제든 해지할 수 있으며, 해지해도 결제 기간이 끝날 때까지 Pro가 유지됩니다.</p></div></div></div>;}
function Settings({user,analyses,go,onDelete,onWithdraw,toast}){
const [confirm,setConfirm]=React.useState(null);const [wd,setWd]=React.useState(false);const [txt,setTxt]=React.useState('');const [wstep,setWstep]=React.useState(-1);
const wsteps=['Polar 구독 취소','원본 파일 삭제','계정 · 분석 데이터 삭제'];
React.useEffect(()=>{if(wstep<0)return;if(wstep>=wsteps.length){const t=setTimeout(onWithdraw,500);return()=>clearTimeout(t);}const t=setTimeout(()=>setWstep(wstep+1),800);return()=>clearTimeout(t);},[wstep]);
return <div className="fs-wrap fs-page fs-narrow"><PageTitle title="설정"/>
<section className="fs-set"><SectionHead title="구독"/><div className="fs-setrow"><span className="fs-grow">{user.plan==='pro'?<><b>Pro</b> · $9/월 · 다음 결제일 2026년 10월 29일</>:<><b>Free</b> · 이번 달 분석 {user.used}/5회 사용</>}</span>{user.plan==='pro'?<Button size="sm" variant="secondary" iconRight="external-link" onClick={()=>toast('Polar 고객 포털로 이동합니다 (해지 · 결제수단 변경)')}>구독 관리</Button>:<Button size="sm" onClick={()=>go('checkout')}>Pro로 업그레이드</Button>}</div></section>
<section className="fs-set"><SectionHead title="분석 기록" count={analyses.length}/><p className="fs-cap fs-muted" style={{marginTop:0}}>삭제하면 원본 파일도 함께 삭제됩니다. 사용한 분석 횟수는 복구되지 않습니다.</p>
{analyses.length===0?<p className="fs-muted">분석 기록이 없습니다.</p>:<ul className="fs-list">{analyses.map(a=><li key={a.id}><span className="fs-grow">{a.title}<div className="fs-cap fs-muted">{a.files.join(' · ')} · {a.created}</div></span>{confirm===a.id?<div className="fs-row"><button className="fs-textbtn fs-cap" onClick={()=>setConfirm(null)}>취소</button><Button size="sm" onClick={()=>{onDelete(a.id);setConfirm(null);}}>삭제</Button></div>:<IconButton icon="trash-2" label="삭제" variant="ghost" size={36} onClick={()=>setConfirm(a.id)}/>}</li>)}</ul>}</section>
<section className="fs-set"><SectionHead title="계정"/><div className="fs-setrow"><span className="fs-grow">{user.email}</span><button className="fs-textbtn fs-danger" onClick={()=>setWd(true)}>회원 탈퇴</button></div></section>
{wd&&<div className="fs-modal-bg" onClick={()=>wstep<0&&setWd(false)}><div className="fs-modal" onClick={e=>e.stopPropagation()}><h2 className="fs-h2">회원 탈퇴</h2>
{wstep<0?<><p className="fs-muted">아래 순서로 처리되며 되돌릴 수 없습니다.</p><ol className="fs-progress">{wsteps.map(s=><li key={s}><span className="fs-pdot"></span>{s}</li>)}</ol><Field label="확인을 위해 '탈퇴'를 입력하세요" value={txt} onChange={setTxt}/><div className="fs-row" style={{justifyContent:'flex-end'}}><Button variant="secondary" size="sm" onClick={()=>setWd(false)}>취소</Button><Button size="sm" disabled={txt!=='탈퇴'} onClick={()=>setWstep(0)}>탈퇴하기</Button></div></>:
<ol className="fs-progress">{wsteps.map((s,k)=><li key={s} className={k<wstep?'done':k===wstep?'now':''}><span className="fs-pdot">{k<wstep?<Icon name="check" size={14}/>:null}</span>{s}</li>)}</ol>}</div></div>}</div>;}
Object.assign(window,{Dashboard,Upload,Analyzing,Result,Checkout,Settings});
