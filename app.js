const $=id=>document.getElementById(id);
const state={cash:1000,position:null,trades:[],realized:0,ohlcv:[],signal:null,price:0,symbol:"BTC-USDT",busy:false};
const feeRate=.001;
const fmt=(n,d=2)=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const toast=msg=>{const t=$("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2600)};
function save(){localStorage.setItem("aqp_state",JSON.stringify({cash:state.cash,position:state.position,trades:state.trades,realized:state.realized}))}
function restore(){try{const x=JSON.parse(localStorage.getItem("aqp_state")||"{}");if(Number.isFinite(x.cash))state.cash=x.cash;state.position=x.position||null;state.trades=x.trades||[];state.realized=x.realized||0}catch{}}
function ema(a,p){let k=2/(p+1),v=a[0];return a.map((x,i)=>{if(i===0)return v;v=x*k+v*(1-k);return v})}
function calcRSI(closes){let gains=0,losses=0;for(let i=closes.length-14;i<closes.length;i++){let d=closes[i]-closes[i-1];if(d>0)gains+=d;else losses-=d}let ag=gains/14,al=losses/14;return al===0?100:100-100/(1+ag/al)}
function analyze(data){
 const c=data.map(x=>x[4]),v=data.map(x=>x[5]),ef=ema(c,12),es=ema(c,26),rsi=calcRSI(c);
 const m=ema(c,12).map((x,i)=>x-ema(c,26)[i]),ms=ema(m,9),hist=m.map((x,i)=>x-ms[i]);
 let score=50,reasons=[];
 if(ef.at(-1)>es.at(-1)){score+=18;reasons.push("EMA12 高于 EMA26，趋势偏多")}else{score-=18;reasons.push("EMA12 低于 EMA26，趋势偏空")}
 if(hist.at(-1)>0){score+=12;reasons.push("MACD 柱为正")}else{score-=12;reasons.push("MACD 柱为负")}
 if(rsi>=45&&rsi<=65){score+=10;reasons.push("RSI 位于相对温和区间")}else if(rsi>75){score-=12;reasons.push("RSI 偏高，避免追涨")}else if(rsi<30){score+=5;reasons.push("RSI 超卖，等待反转确认")}
 const avg=v.slice(-21,-1).reduce((a,b)=>a+b,0)/20,vol=v.at(-1)>avg;
 if(vol){score+=5;reasons.push("成交量高于20周期均量")}
 score=Math.max(0,Math.min(100,score));
 const buy=score>=68&&ef.at(-1)>es.at(-1),sell=score<=32||rsi>78;
 return {score,rsi,trend:ef.at(-1)>es.at(-1)?"多头":"空头",macd:hist.at(-1),vol,buy,sell,label:buy?"偏多 / 买入观察":sell?"偏空 / 卖出观察":"中性 / 暂不操作",reason:reasons.join("；")};
}
async function fetchMarket(symbol=state.symbol){
 if(state.busy)return;state.busy=true;$("lastprice").textContent="加载中…";
 try{
  const bar=$("interval").value, url=`https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${bar}&limit=200`;
  const res=await fetch(url);if(!res.ok)throw Error("行情接口响应异常");
  const j=await res.json();if(j.code!=="0"||!j.data?.length)throw Error(j.msg||"没有行情数据");
  state.ohlcv=j.data.reverse().map(r=>[+r[0],+r[1],+r[2],+r[3],+r[4],+r[5]]);
  state.price=state.ohlcv.at(-1)[4];state.signal=analyze(state.ohlcv);
  render();$("updated").textContent="最后更新："+new Date().toLocaleString();
 }catch(e){$("lastprice").textContent="行情暂不可用";toast("获取 OKX 行情失败："+e.message)}
 finally{state.busy=false}
}
function renderChart(){
 const cv=$("chart"),ctx=cv.getContext("2d"),w=cv.clientWidth,h=cv.clientHeight,dpr=devicePixelRatio||1;
 cv.width=w*dpr;cv.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 const a=state.ohlcv.slice(-70);if(a.length<2)return;
 const vals=a.map(x=>x[4]),min=Math.min(...vals),max=Math.max(...vals),pad=12;
 ctx.strokeStyle="#26334b";ctx.lineWidth=1;for(let i=1;i<4;i++){let y=h*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
 ctx.beginPath();vals.forEach((v,i)=>{let x=pad+i*(w-2*pad)/(vals.length-1),y=h-pad-(v-min)/(max-min||1)*(h-2*pad);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
 ctx.strokeStyle="#35d5a4";ctx.lineWidth=2;ctx.stroke();
 const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,"rgba(39,215,160,.22)");grad.addColorStop(1,"rgba(39,215,160,0)");
 ctx.lineTo(w-pad,h-pad);ctx.lineTo(pad,h-pad);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
}
function render(){
 const p=state.price,pos=state.position,unreal=pos?(p-pos.entry)*pos.qty:0,equity=state.cash+(pos?pos.qty*p:0);
 $("equity").textContent=fmt(equity);$("cash").textContent=fmt(state.cash)+" USDT";$("realized").textContent=fmt(state.realized)+" USDT";
 $("holding").textContent=pos?pos.symbol.replace("-","/"):"无持仓";$("unrealized").textContent=fmt(unreal)+" USDT";$("unrealized").className=unreal>=0?"positive":"negative";
 $("score").textContent=state.signal?state.signal.score+" / 100":"--";$("tradecount").textContent=state.trades.length+" 笔";
 $("lastprice").textContent=fmt(p,p>100?2:5);const old=state.ohlcv.at(-2)?.[4]||p,chg=(p/old-1)*100;
 $("change").textContent=(chg>=0?"+":"")+fmt(chg)+"%";$("change").className=chg>=0?"positive":"negative";
 if(state.signal){let s=state.signal;$("signaltext").textContent=s.label;$("signalpill").textContent=s.buy?"买入观察":s.sell?"卖出观察":"观望";$("signalpill").className="signal-pill "+(s.buy?"buy":s.sell?"sell":"");$("rsi").textContent=fmt(s.rsi,1);$("trend").textContent=s.trend;$("macd").textContent=fmt(s.macd,5);$("volume").textContent=s.vol?"放量":"正常";$("reason").textContent=s.reason}
 renderChart();$("port-equity").textContent=fmt(equity)+" USDT";
 $("positionbox").innerHTML=pos?`<b>${pos.symbol.replace("-","/")}</b><p class="subtle">持仓数量：${fmt(pos.qty,6)}<br>开仓价格：${fmt(pos.entry,4)} USDT<br>浮动盈亏：<b class="${unreal>=0?"positive":"negative"}">${fmt(unreal)} USDT</b></p>`:'<div class="empty">当前没有模拟持仓</div>';
 $("historyrows").innerHTML=state.trades.length?state.trades.slice().reverse().map(t=>`<tr><td>${new Date(t.time).toLocaleString()}</td><td class="${t.side==="买入"?"positive":"negative"}">${t.side}</td><td>${fmt(t.price,4)}</td><td>${fmt(t.qty,6)}</td><td>${t.pnl==null?"—":fmt(t.pnl)}</td></tr>`).join(""):'<tr><td colspan="5" class="empty">暂无记录</td></tr>';
}
function paperTrade(){
 if(!state.signal)return toast("请先获取行情");
 const p=state.price,s=state.signal;
 if(state.position&&(s.sell||!s.buy)){closePosition("策略退出");toast("策略触发，已模拟平仓");return}
 if(!state.position&&s.buy){
  const risk=state.cash*.01,qtyRisk=risk/(p*.03),qtyCap=state.cash*.25/p,qty=Math.min(qtyRisk,qtyCap),cost=qty*p,fee=cost*feeRate;
  if(qty<=0||cost+fee>state.cash)return toast("模拟资金不足");
  state.cash-=cost+fee;state.position={symbol:state.symbol,qty,entry:p,entryFee:fee};state.trades.push({time:Date.now(),side:"买入",symbol:state.symbol,price:p,qty,pnl:null});save();render();toast("模拟买入已记账");return;
 }
 toast("当前信号未满足开仓条件，继续观望");
}
function closePosition(reason="手动平仓"){
 if(!state.position)return toast("当前没有持仓");
 const pos=state.position,gross=pos.qty*state.price,fee=gross*feeRate,pnl=(state.price-pos.entry)*pos.qty-pos.entryFee-fee;
 state.cash+=gross-fee;state.realized+=pnl;state.trades.push({time:Date.now(),side:"卖出",symbol:pos.symbol,price:state.price,qty:pos.qty,pnl});state.position=null;save();render();
}
function backtest(){
 if(state.ohlcv.length<50)return toast("K线数量不足");
 let cash=1000,qty=0,entry=0,trades=0,peak=1000,maxdd=0;
 const hist=[];
 for(let i=35;i<state.ohlcv.length;i++){
  const slice=state.ohlcv.slice(0,i+1),s=analyze(slice),p=slice.at(-1)[4];
  if(!qty&&s.buy){let spend=cash*.25;qty=spend/(p*(1+feeRate));cash-=qty*p*(1+feeRate);entry=p;trades++}
  else if(qty&&s.sell){cash+=qty*p*(1-feeRate);qty=0;trades++}
  const eq=cash+qty*p;hist.push(eq);peak=Math.max(peak,eq);maxdd=Math.min(maxdd,(eq/peak-1)*100);
 }
 const final=hist.at(-1)||1000,ret=(final/1000-1)*100,bh=(state.price/state.ohlcv[35][4]-1)*100;
 $("backtestresult").innerHTML=`<b>策略模拟收益：${fmt(ret)}%</b><br>买入持有：${fmt(bh)}%<br>最大回撤：${fmt(maxdd)}%<br>交易次数：${trades}<br><span class="subtle">简化回测结果，不代表未来表现；未计滑点、点差和市场冲击。</span>`;
}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.page).classList.add("active");if(b.dataset.page==="dashboard")renderChart()}));
$("symbol").addEventListener("change",e=>{state.symbol=e.target.value;fetchMarket()});
$("refresh").onclick=()=>fetchMarket();$("runtrade").onclick=paperTrade;$("closepos").onclick=()=>closePosition();
$("reset").onclick=()=>{if(confirm("确定清空模拟账户和所有交易记录？")){state.cash=1000;state.position=null;state.trades=[];state.realized=0;save();render();toast("模拟账户已重置")}};
$("backtest").onclick=backtest;$("interval").onchange=()=>fetchMarket();
restore();render();fetchMarket();setInterval(()=>fetchMarket(),60000);
window.addEventListener("resize",renderChart);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
