function Landing({go,user}){
const d=React.useMemo(()=>fsBuild(['card','bank']),[]);
const cta=()=>go(user?'dashboard':'signup');
const rows=[['분석당 파일 수','1개','최대 3개 (여러 카드·계좌 통합)'],['카테고리 분류 · 차트 · 거래 목록','포함','포함'],['이번 분석 요약','포함','포함'],['정기결제 · 이상거래 탐지','발견 건수만','상세 목록'],['월별 추이 · 전월 대비','—','포함'],['AI 인사이트 & 절약 조언','—','포함'],['월 분석 횟수','5회','50회']];
return <div><PublicHeader go={go} user={user}/>
<section className="fs-hero fs-wrap"><div className="fs-hero-copy"><h1 className="fs-display">명세서를 올리면<br/>지출이 정리됩니다</h1>
<p className="fs-lead">카드 명세서·은행 거래내역(CSV·엑셀)을 그대로 올리세요. 카드사마다 다른 형식은 AI가 읽고, 카테고리 분류와 요약, 새는 돈까지 찾아 드립니다.</p>
<div className="fs-row"><Button onClick={cta}>무료로 시작하기</Button><Button variant="secondary" onClick={()=>go('sample')}>샘플 결과 보기</Button></div></div>
<div className="fs-hero-shot"><div className="fs-shot"><div className="fs-cap fs-muted">2026년 9월 · 신한카드 + KB국민은행</div><div className="fs-num-xl">{fsWon(d.total)}</div><ShareStrip data={d}/><div className="fs-shot-grid">{d.cats.slice(0,4).map(c=><div key={c.name}><div className="fs-cap fs-muted">{c.name}</div><div className="fs-strong">{fsWon(c.amt)}</div></div>)}</div>
<div className="fs-shot-alert"><Icon name="repeat" size={16}/><span>정기결제 {d.recurring.length}건 · 이상거래 {d.anomalies.length}건 발견</span></div></div></div></section>
<section id="features" className="fs-wrap fs-section"><h2 className="fs-h2">형식은 신경 쓰지 마세요</h2>
<div className="fs-feat">{[['file-spreadsheet','어떤 명세서든','CSV, xlsx, xls(HTML 표 포함), EUC-KR까지. 날짜·금액·가맹점 열을 AI가 알아서 찾습니다.'],['pie-chart','카테고리별 정리','식비, 쇼핑, 구독 등으로 분류하고 총지출, 상위 가맹점, 비중을 한 화면에 보여줍니다.'],['repeat','새는 돈 찾기','잊고 있던 정기결제, 같은 금액 중복 결제, 갑자기 늘어난 지출을 찾아냅니다.'],['layers','여러 카드 한 번에','Pro는 카드·계좌 파일 3개를 합쳐 전체 지출을 한 번에 봅니다.']].map(([ic,h,b])=><div key={h} className="fs-feat-i"><div className="fs-ico"><Icon name={ic} size={22}/></div><div className="fs-strong">{h}</div><p className="fs-muted">{b}</p></div>)}</div></section>
<section className="fs-wrap fs-section"><h2 className="fs-h2">이용 방법</h2><ol className="fs-steps">{[['파일 올리기','카드사·은행 앱에서 받은 이용내역 파일을 그대로 올립니다.'],['분석 기다리기','AI가 열을 읽고 거래를 분류합니다. 보통 1분 안에 끝납니다.'],['결과 확인','카테고리, 상위 가맹점, 정기결제와 절약 포인트를 확인합니다.']].map(([h,b],i)=><li key={h}><span className="fs-display fs-stepn">{i+1}</span><div className="fs-strong">{h}</div><p className="fs-muted">{b}</p></li>)}</ol></section>
<section id="pricing" className="fs-wrap fs-section"><h2 className="fs-h2">요금제</h2>
<div className="fs-plans"><div className="fs-plan"><div className="fs-strong">Free</div><div className="fs-num-xl">$0</div><p className="fs-muted">한 장의 명세서를 정리할 때</p><Button variant="secondary" fullWidth onClick={cta}>무료로 시작하기</Button></div>
<div className="fs-plan fs-plan-pro"><div className="fs-strong">Pro</div><div className="fs-num-xl">$9<span className="fs-cap"> / 월</span></div><p>여러 카드·계좌를 합쳐 새는 돈까지 찾을 때</p><Button variant="on-image" fullWidth onClick={cta}>Pro 시작하기</Button></div></div>
<div className="fs-tablewrap"><table className="fs-table fs-compare"><thead><tr><th></th><th>Free</th><th>Pro</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}><td>{r[0]}</td><td className="fs-muted">{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
<p className="fs-cap fs-muted">월 분석 횟수는 성공한 분석 기준이며, 분석을 삭제해도 복구되지 않습니다. 원화(KRW) 명세서만 지원합니다.</p></section>
<section className="fs-band"><div className="fs-wrap fs-band-in"><h2 className="fs-display fs-band-h">이번 달 지출부터 정리하세요</h2><Button variant="on-image" onClick={cta}>무료로 시작하기</Button></div></section>
<footer className="fs-foot fs-wrap"><Wordmark size={18}/><div className="fs-row fs-cap fs-muted"><a>이용약관</a><a>개인정보처리방침</a><a>문의</a></div><span className="fs-cap fs-muted">© 2026 finsight</span></footer></div>;}

function AuthShell({go,children}){return <div className="fs-auth"><div className="fs-auth-top"><Wordmark onClick={()=>go('landing')}/></div><div className="fs-auth-card">{children}</div></div>;}
function GoogleBtn({onClick}){return <button className="fs-google" onClick={onClick}><span className="fs-g">G</span>Google로 계속하기</button>;}
function Field({label,type='text',value,onChange,error,placeholder,hint}){return <label className="fs-field"><span className="fs-cap">{label}</span><input className={'fs-input'+(error?' err':'')} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>{error?<span className="fs-err">{error}</span>:hint?<span className="fs-cap fs-muted">{hint}</span>:null}</label>;}
function Login({go,onLogin}){
const [email,setEmail]=React.useState('');const [pw,setPw]=React.useState('');const [err,setErr]=React.useState({});
const submit=()=>{const e={};if(!/^\S+@\S+\.\S+$/.test(email))e.email='이메일 형식을 확인해 주세요.';if(pw.length<8)e.pw='비밀번호는 8자 이상입니다.';setErr(e);if(!Object.keys(e).length)onLogin(email);};
return <AuthShell go={go}><h1 className="fs-h2">로그인</h1><GoogleBtn onClick={()=>onLogin('jiyoon.kim@gmail.com')}/><div className="fs-or"><span>또는 이메일</span></div>
<Field label="이메일" value={email} onChange={setEmail} error={err.email} placeholder="name@example.com"/><Field label="비밀번호" type="password" value={pw} onChange={setPw} error={err.pw}/>
<button className="fs-textbtn fs-cap" style={{alignSelf:'flex-end'}} onClick={()=>go('reset')}>비밀번호를 잊으셨나요?</button>
<Button fullWidth onClick={submit}>로그인</Button><p className="fs-cap fs-muted fs-center">계정이 없으신가요? <a onClick={()=>go('signup')}>회원가입</a></p>
<button className="fs-demo" onClick={()=>onLogin('jiyoon.kim@gmail.com')}>데모 계정으로 바로 로그인</button></AuthShell>;}
function Signup({go,onVerifySent,onLogin}){
const [email,setEmail]=React.useState('');const [pw,setPw]=React.useState('');const [c1,setC1]=React.useState(false);const [c2,setC2]=React.useState(false);const [err,setErr]=React.useState({});
const submit=()=>{const e={};if(!/^\S+@\S+\.\S+$/.test(email))e.email='이메일 형식을 확인해 주세요.';if(pw.length<8)e.pw='8자 이상 입력해 주세요.';if(!c1||!c2)e.c='필수 항목에 동의해 주세요.';setErr(e);if(!Object.keys(e).length)onVerifySent(email);};
return <AuthShell go={go}><h1 className="fs-h2">회원가입</h1><GoogleBtn onClick={()=>{if(!c1||!c2){setErr({c:'Google 가입 전에도 필수 항목 동의가 필요합니다.'});return;}onLogin('new.user@gmail.com',true);}}/><div className="fs-or"><span>또는 이메일</span></div>
<Field label="이메일" value={email} onChange={setEmail} error={err.email} placeholder="name@example.com"/><Field label="비밀번호" type="password" value={pw} onChange={setPw} error={err.pw} hint="8자 이상"/>
<div className="fs-consent"><label><input type="checkbox" checked={c1} onChange={e=>setC1(e.target.checked)}/><span>[필수] 이용약관 및 개인정보 수집·이용에 동의합니다.</span></label>
<label><input type="checkbox" checked={c2} onChange={e=>setC2(e.target.checked)}/><span>[필수] 개인정보 국외 이전에 동의합니다.<span className="fs-cap fs-muted fs-block">분석·결제·호스팅을 위해 Anthropic(미국), Polar(미국), Vercel(미국)로 이전됩니다.</span></span></label>{err.c&&<span className="fs-err">{err.c}</span>}</div>
<Button fullWidth onClick={submit}>가입하기</Button><p className="fs-cap fs-muted fs-center">이미 계정이 있으신가요? <a onClick={()=>go('login')}>로그인</a></p></AuthShell>;}
function VerifySent({go,email,onLogin}){return <AuthShell go={go}><div className="fs-ico"><Icon name="mail" size={22}/></div><h1 className="fs-h2">메일함을 확인해 주세요</h1><p className="fs-muted"><b className="fs-ink">{email}</b>로 인증 링크를 보냈습니다. 링크를 열면 가입이 완료됩니다. 다른 기기에서 열어도 됩니다.</p><Button variant="secondary" fullWidth>인증 메일 다시 보내기</Button><button className="fs-demo" onClick={()=>onLogin(email,true)}>데모: 인증 링크 열기</button></AuthShell>;}
function Reset({go}){const [email,setEmail]=React.useState('');const [sent,setSent]=React.useState(false);
return <AuthShell go={go}><h1 className="fs-h2">비밀번호 재설정</h1>{sent?<><p className="fs-muted"><b className="fs-ink">{email}</b>로 재설정 링크를 보냈습니다.</p><Button fullWidth onClick={()=>go('login')}>로그인으로 돌아가기</Button></>:<><p className="fs-muted">가입한 이메일로 재설정 링크를 보내드립니다.</p><Field label="이메일" value={email} onChange={setEmail} placeholder="name@example.com"/><Button fullWidth disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={()=>setSent(true)}>링크 보내기</Button><p className="fs-cap fs-center"><a onClick={()=>go('login')}>로그인으로 돌아가기</a></p></>}</AuthShell>;}
Object.assign(window,{Landing,Login,Signup,VerifySent,Reset});
