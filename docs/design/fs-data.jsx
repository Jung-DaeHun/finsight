const FS_SOURCES={card:'신한카드',bank:'KB국민은행',card2:'현대카드'};
const FS_FILES={card:'신한카드_이용내역_202609.xlsx',bank:'KB국민_거래내역_202609.csv',card2:'현대카드_명세서_202609.xls'};
const FS_TX_RAW=[
['09-01','넷플릭스','정기결제','구독·디지털',17000,'card'],
['09-01','스타벅스 강남역점','일시불','카페·간식',6300,'card'],
['09-02','배달의민족','일시불','식비',28900,'card'],
['09-02','카카오T 택시','일시불','교통',14200,'card'],
['09-03','쿠팡','일시불','쇼핑',41200,'card'],
['09-04','GS25 역삼점','일시불','생활·마트',4800,'card'],
['09-05','유튜브 프리미엄','정기결제','구독·디지털',14900,'card'],
['09-05','올리브영 강남본점','일시불','쇼핑',38500,'card'],
['09-06','이마트 성수점','일시불','생활·마트',87400,'card'],
['09-07','CGV 용산아이파크몰','일시불','문화·여가',30000,'card'],
['09-07','배달의민족','일시불','식비',31500,'card'],
['09-08','쿠팡와우 멤버십','정기결제','구독·디지털',7890,'card'],
['09-09','스타벅스 강남역점','일시불','카페·간식',6300,'card'],
['09-10','교보문고 광화문점','일시불','문화·여가',24000,'card'],
['09-11','배달의민족','일시불','식비',26800,'card'],
['09-12','무신사','3개월 할부','쇼핑',89000,'card'],
['09-13','카카오T 택시','일시불','교통',11800,'card'],
['09-14','쿠팡','일시불','쇼핑',32800,'card','dup'],
['09-14','쿠팡','일시불','쇼핑',32800,'card','dup'],
['09-15','멜론','정기결제','구독·디지털',10900,'card'],
['09-15','Apple iCloud+','해외 USD 2.99','구독·디지털',4400,'card'],
['09-16','김밥천국 역삼점','일시불','식비',8500,'card'],
['09-17','배달의민족','일시불','식비',34200,'card'],
['09-18','연세세브란스의원','일시불','의료',12400,'card'],
['09-19','다이소 강남점','일시불','생활·마트',9000,'card'],
['09-20','스타벅스 선릉점','일시불','카페·간식',5900,'card'],
['09-20','쿠팡이츠','일시불','식비',22700,'card'],
['09-21','밀리의서재','정기결제','구독·디지털',9900,'card'],
['09-22','이마트 성수점','일시불','생활·마트',64300,'card'],
['09-23','배달의민족','일시불','식비',29900,'card'],
['09-24','GS칼텍스 역삼주유소','일시불','교통',70000,'card'],
['09-25','메가MGC커피','일시불','카페·간식',2000,'card'],
['09-26','배달의민족','일시불','식비',38600,'card'],
['09-27','마켓컬리','일시불','생활·마트',56200,'card'],
['09-28','아웃백 강남점','일시불','식비',92000,'card'],
['09-29','스타벅스 강남역점','일시불','카페·간식',6300,'card'],
['09-30','배달의민족','일시불','식비',27400,'card'],
['09-01','월세','자동이체','주거',650000,'bank'],
['09-05','티머니 충전','체크카드','교통',50000,'bank'],
['09-10','SKT 통신요금','자동이체','통신',69000,'bank'],
['09-15','아파트 관리비','자동이체','주거',128000,'bank'],
['09-25','삼성화재 실손보험','자동이체','보험·금융',42000,'bank'],
['09-08','Adobe Creative Cloud','해외 USD 17.99','구독·디지털',24000,'card2'],
['09-19','오늘의집','일시불','쇼핑',112000,'card2'],
['09-27','스타벅스 삼성점','일시불','카페·간식',6300,'card2']
];
const FS_TX=FS_TX_RAW.map((r,i)=>({id:i,date:r[0],merchant:r[1],desc:r[2],cat:r[3],amt:r[4],src:r[5],flag:r[6]}));
const FS_RECURRING=[
{m:'넷플릭스',amt:17000,months:14,next:'10-01',src:'card'},
{m:'유튜브 프리미엄',amt:14900,months:22,next:'10-05',src:'card'},
{m:'멜론',amt:10900,months:9,next:'10-15',src:'card'},
{m:'밀리의서재',amt:9900,months:6,next:'10-21',src:'card'},
{m:'쿠팡와우 멤버십',amt:7890,months:18,next:'10-08',src:'card'},
{m:'Apple iCloud+',amt:4400,months:30,next:'10-15',src:'card'},
{m:'Adobe Creative Cloud',amt:24000,months:4,next:'10-08',src:'card2'},
{m:'SKT 통신요금',amt:69000,months:24,next:'10-10',src:'bank'},
{m:'월세',amt:650000,months:12,next:'10-01',src:'bank'}
];
const FS_PREV_SRC={card:{4:982000,5:1043200,6:948700,7:1186400,8:952790},bank:{4:939000,5:946000,6:939000,7:951000,8:939000},card2:{4:118000,5:96500,6:131200,7:164800,8:92600}};
const FS_PREV_CAT_SRC={card:{'식비':286000,'카페·간식':29800,'쇼핑':214000,'생활·마트':198400,'교통':121000,'구독·디지털':65590,'문화·여가':38000},bank:{'주거':778000,'통신':69000,'교통':50000,'보험·금융':42000},card2:{'구독·디지털':24000,'쇼핑':56000,'카페·간식':12600}};
function fsWon(n){return '₩'+Math.round(n).toLocaleString('ko-KR');}
function fsBuild(srcs){
const tx=FS_TX.filter(t=>srcs.includes(t.src));
const total=tx.reduce((a,t)=>a+t.amt,0);
const FS_PREV={};[4,5,6,7,8].forEach(m=>{FS_PREV[m]=srcs.reduce((a,s)=>a+FS_PREV_SRC[s][m],0);});
const FS_PREV_CAT={};srcs.forEach(s=>Object.entries(FS_PREV_CAT_SRC[s]).forEach(([k,v])=>{FS_PREV_CAT[k]=(FS_PREV_CAT[k]||0)+v;}));
const cm={};tx.forEach(t=>{cm[t.cat]=(cm[t.cat]||0)+t.amt;});
const cats=Object.entries(cm).map(([name,amt])=>({name,amt,pct:amt/total,prev:FS_PREV_CAT[name]})).sort((a,b)=>b.amt-a.amt);
const mm={};tx.forEach(t=>{const k=/(점|주유소|몰)$/.test(t.merchant)?t.merchant.split(' ').slice(0,-1).join(' '):t.merchant;mm[k]=mm[k]||{name:k,amt:0,n:0};mm[k].amt+=t.amt;mm[k].n++;});
const merchants=Object.values(mm).sort((a,b)=>b.amt-a.amt).slice(0,5);
const recurring=FS_RECURRING.filter(r=>srcs.includes(r.src));
const delivery=tx.filter(t=>t.merchant==='배달의민족'||t.merchant==='쿠팡이츠');
const delivSum=delivery.reduce((a,t)=>a+t.amt,0);
const anomalies=[{type:'중복 결제',title:'쿠팡 ₩32,800 2건',detail:'9월 14일 같은 가맹점·같은 금액으로 두 번 결제되었습니다.',amt:32800}];
if(srcs.includes('card'))anomalies.push({type:'급증',title:'배달 지출 +'+Math.round((delivSum/129400-1)*100)+'%',detail:'배달의민족·쿠팡이츠 '+delivery.length+'회 '+fsWon(delivSum)+' (8월 '+fsWon(129400)+')',amt:delivSum-129400});
const recSum=recurring.filter(r=>r.src!=='bank').reduce((a,r)=>a+r.amt,0);
const trend=[4,5,6,7,8].map(m=>({m:m+'월',amt:FS_PREV[m]})).concat([{m:'9월',amt:total}]);
const insights=[
{h:'배달을 주 1회 줄이면 월 약 '+fsWon(Math.round(delivSum/delivery.length/1000)*1000*4)+' 절약',b:'9월 배달 주문은 '+delivery.length+'회, 평균 '+fsWon(delivSum/delivery.length)+'입니다. 8월보다 '+Math.round((delivSum/129400-1)*100)+'% 늘었습니다.',save:Math.round(delivSum/delivery.length/1000)*1000*4},
{h:'음악·도서 구독 2건, 월 '+fsWon(20800),b:'멜론과 밀리의서재가 매달 결제되고 있습니다. 실제로 쓰는지 확인해 보세요. 디지털 구독은 총 '+recurring.filter(r=>r.src!=='bank').length+'건, 월 '+fsWon(recSum)+'입니다.',save:20800},
{h:'쿠팡 중복 결제 '+fsWon(32800)+' 확인 필요',b:'9월 14일 동일 금액 결제가 2건 있습니다. 취소되지 않았다면 고객센터에 환불을 요청하세요.',save:32800},
{h:'카페 지출의 '+Math.round(tx.filter(t=>t.merchant.startsWith('스타벅스')).reduce((a,t)=>a+t.amt,0)/(cm['카페·간식']||1)*100)+'%가 스타벅스',b:'카페·간식 '+fsWon(cm['카페·간식']||0)+' 중 대부분이 한 브랜드입니다. 앱 쿠폰·텀블러 할인을 활용할 수 있습니다.',save:0}
];
return {tx,total,cats,merchants,recurring,anomalies,trend,insights,prev:FS_PREV[8],srcs};
}
Object.assign(window,{FS_SOURCES,FS_FILES,FS_TX,fsWon,fsBuild});
