/* Energy Assistant sidebar panel. Tab 1: household power. */
const BASE = new URL(import.meta.url).pathname.replace(/\/[^/]*$/, "");

// @font-face must live in the document, not in the shadow DOM.
if (!document.getElementById("energy-assistant-fonts")) {
  const l = document.createElement("link");
  l.id = "energy-assistant-fonts";
  l.rel = "stylesheet";
  l.href = `${BASE}/energy-assistant-tokens.css`;
  document.head.appendChild(l);
}

const HISTORY_HOURS = 24;
const BUCKET_MIN = 5;

const STYLE = `
:host{display:block;min-height:100%;background:var(--eb-bg);color:var(--eb-text);font-family:var(--eb-font)}
*{box-sizing:border-box}
.wrap{padding:16px 24px}
.top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:16px}
.top .right{justify-self:end}
.menu{background:none;border:0;color:var(--eb-muted);cursor:pointer;padding:6px}
.tabs{display:flex;gap:4px;padding:4px;background:var(--eb-panel);border:1px solid var(--eb-line);border-radius:14px}
.gear{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;border:1px solid var(--eb-line);background:var(--eb-panel);color:var(--eb-muted);cursor:pointer;padding:0}
.gear:hover{color:var(--eb-text)}
.gear.active{background:rgba(255,255,255,.08);color:var(--eb-text);border-color:var(--eb-green)}
.gear svg{width:20px;height:20px}
.tab{border:0;background:none;color:var(--eb-muted);font:600 14px var(--eb-font);padding:8px 16px;border-radius:10px;cursor:pointer}
.tab.active{background:rgba(255,255,255,.08);color:var(--eb-text)}
.grid{display:grid;gap:var(--eb-gap);grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
.set .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.wide{grid-column:1/-1}
.trio{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:var(--eb-gap);align-items:stretch}
.sec .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));column-gap:28px;align-items:start}
.fld.span{grid-column:1/-1}
@media (max-width:800px){.grid,.set .grid{grid-template-columns:minmax(0,1fr)}.wrap{padding:12px}}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.eb-label.costs{margin-top:18px}
.fullrow{grid-column:1/-1}
.spk{display:inline-block;vertical-align:middle;margin-right:10px;overflow:visible}
.spk .spkline{fill:none;stroke:var(--eb-green);stroke-width:1.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.spk .spkarea{fill:var(--eb-green);opacity:.15}
.spk.big{display:block;margin:6px 0 4px;width:100%;height:56px}
.dev .line.open .nt{border-bottom:1px dotted var(--eb-dim)}
.bpick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.bpick .segs{margin-top:0}
.bpick .nav{display:flex;align-items:center;gap:8px;margin-left:auto}
.eb-card.pickbar{padding:8px 16px;border-radius:16px}
.pickbar .bpick{margin-top:0}
.pickbar .seg{padding:3px 12px;line-height:1.25}
.bpick .lab{min-width:11em;text-align:center;font-weight:600;font-size:14px}
.seg[disabled]{opacity:.4;cursor:default}
.stack{display:grid;gap:var(--eb-gap);grid-template-columns:minmax(0,1fr)}
.dtop{display:flex;gap:24px;align-items:center;margin-top:14px;flex-wrap:wrap}
.dring{flex:none;width:130px}
.donut{display:block;width:100%;height:auto}
.donut .dv{font:700 15px var(--eb-font);fill:var(--eb-text)}
.donut .du{font:500 7px var(--eb-font);fill:var(--eb-muted)}
.dside{flex:1 1 320px;min-width:0}
.sbar{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden}
.sbar i{display:block;min-width:2px}
.dlegend{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:14px}
.dl{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.dl .ln{color:var(--eb-text)}
.dl small{color:var(--eb-dim)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;flex:none}
.eb-label.davg{margin-top:14px;text-transform:none;letter-spacing:0}
.eb-title .ico,.dl .ico{--mdc-icon-size:18px;margin-right:6px;vertical-align:middle}
.eb-label.vs.bad{color:var(--eb-red)}
.eb-label.vs.good{color:var(--eb-green)}
.dchart{margin-top:6px}
.dchart svg{display:block;width:100%;height:auto}
.cats2{display:grid;gap:var(--eb-gap);grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))}
.cat .cbody{display:flex;gap:16px;align-items:center;margin-top:12px}
.cat .dring{width:92px}
.clist{flex:1;min-width:0}
.cr{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13.5px}
.cr .cn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cr small{color:var(--eb-muted)}
.cr .cp{min-width:34px;text-align:right}
.cards{display:grid;gap:var(--eb-gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
.pair{display:grid;gap:var(--eb-gap);grid-template-columns:repeat(2,minmax(0,1fr))}
@media (max-width:800px){.pair{grid-template-columns:minmax(0,1fr)}}
.amo-bar{height:6px;border-radius:3px;background:var(--eb-line);margin-top:8px;overflow:hidden}
.amo-bar>div{height:100%;border-radius:3px;background:var(--eb-green)}
.alert.info{border-color:var(--eb-green);background:rgba(52,211,153,.12)}
.alert{margin-top:12px;padding:10px 14px;border-radius:12px;border:1px solid #f59e0b;background:rgba(245,158,11,.12);color:var(--eb-text);font-size:14px}
.lc{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(0,1fr));gap:8px;align-items:baseline;padding:9px 0;border-top:1px solid var(--eb-line);font-size:14px}
.lc.head{border-top:0;padding-bottom:2px;color:var(--eb-muted);font-size:12px;margin-top:10px}
.lc .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lc .n{text-align:right;font-weight:600;white-space:nowrap}
.lc.head .n{font-weight:500}
.reshero{display:grid;grid-template-columns:minmax(0,1fr)}
.resillu{display:none}
.eb-card.res{border-radius:var(--eb-radius-card);padding:24px 28px;box-shadow:0 10px 30px rgba(0,0,0,.35),0 0 44px rgba(52,211,153,.07);position:relative;z-index:1;overflow:visible}
.eb-card.res .row{align-items:center}
.resdrive{display:flex;align-items:center;gap:12px;margin-left:auto;border:1px solid var(--eb-tile-border);background:var(--eb-tile);border-radius:var(--eb-radius-tile);padding:8px 16px}
.resdrive .car{color:var(--eb-green);display:flex;filter:drop-shadow(0 0 6px rgba(52,211,153,.55))}
.resub{font-size:12.5px;color:var(--eb-muted)}
.resdk{font-size:14px;color:var(--eb-text)}.resdk b{font-size:17px}
.resgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);margin-top:20px}
.resl{padding-right:28px;border-right:1px solid var(--eb-line)}
.resgrid{align-items:start}
.resgrid.three{grid-template-columns:minmax(0,1.7fr) auto minmax(0,.9fr)}
.resself.live{padding-bottom:0;gap:12px}
.resself.live .resring,.resself.live .resring .donut{width:72px;height:72px}
.resself.live .resbig{font-size:28px}
.resself.live .reslab2{font-size:13px;margin-top:0;font-weight:500;line-height:1.3}
.resself.live .resbig{line-height:1.1}
.resself.live{align-items:flex-start}
.resself.live .dtext{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding-top:6px}
.resm .resself.live{width:100%}
.resm .resself.live .dtext{margin:0 auto;min-width:0}
.dstat{font-size:13px;font-weight:600;color:var(--eb-muted)}
.dwhen{font-size:12px;color:var(--eb-dim)}
.dwhen b{color:var(--eb-text);font-weight:600}
.dstat.discharging{color:var(--ea-bout)}
.dstat.charging{color:var(--ea-bin)}
.resr{align-self:stretch}
.resgrid.three{align-items:stretch}
.resgrid.three .resl{padding-right:22px;display:flex;flex-direction:column}
.resgrid.three .hbars{margin-top:auto;padding-top:22px}
.resgrid.three .resm>:last-child{margin-top:auto}
.stackleg,.resm .bline{line-height:20px;min-height:20px}
.resm .bline{align-items:center}
.resgrid.three .resr{padding-left:22px}
.resgrid.three .resnum{font-size:44px;margin-top:0;gap:16px}
.resgrid.three .resnum small{font-size:16px}
.resgrid.three .pig{display:none}
.resgrid.three .ressave .resbig{font-size:26px}
.resm{padding:0 22px;border-right:1px solid var(--eb-line);display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0}
.resm .dials{display:flex;flex-direction:column;gap:10px}
.resm .bline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--eb-dim)}
.resm .bline b{font-size:15px;color:var(--eb-text)}
.resr{padding-left:28px;display:flex;flex-direction:column;justify-content:center;min-width:0}
.reslab{font-size:11px;font-weight:600;letter-spacing:var(--eb-label-spacing);text-transform:uppercase;color:var(--eb-muted)}
.resnum{display:flex;align-items:flex-start;gap:10px;font-size:56px;font-weight:800;line-height:1.05;color:var(--eb-text);margin-top:8px}
.resnum small{font-size:20px;font-weight:600;color:var(--eb-muted)}
.rn{display:flex;align-items:baseline;gap:8px;min-width:0}
.stackbadge{display:flex;flex-direction:column;gap:4px;margin-left:auto;align-self:flex-start;margin-top:4px}
.stackbadge i{display:block;height:7px;width:38px;border-radius:3px;background:var(--eb-green);box-shadow:0 0 8px rgba(52,211,153,.5)}
.stackbadge i:nth-child(2){background:var(--eb-blue);width:30px;box-shadow:0 0 8px rgba(96,165,250,.5)}
.stackbadge i:nth-child(3){background:var(--eb-solar);width:34px;box-shadow:0 0 8px rgba(255,152,0,.5)}
.stackbadge i:nth-child(4){background:var(--eb-cyan);width:24px;box-shadow:0 0 8px rgba(56,189,248,.5)}
.hbars{margin-top:22px}
.stackh{display:flex;gap:3px;height:10px;border-radius:5px;background:var(--eb-line);overflow:hidden}
.stackh i{display:block;min-width:4px}
.stackleg{display:flex;flex-wrap:nowrap;justify-content:space-between;gap:10px;margin-top:10px;font-size:12px;overflow:hidden;color:var(--eb-dim)}
.stackleg span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.stackleg b{width:10px;height:10px;border-radius:3px}
.stackleg.many{flex-wrap:wrap}
.stackleg em{font-style:normal;font-weight:700;color:var(--eb-text)}
.rbars{display:flex;gap:14px;margin-top:20px}
.rbar{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.rcol{width:100%;height:96px;display:flex;align-items:flex-end;border-bottom:1px solid var(--eb-line)}
.rcol i{display:block;width:100%;border-radius:8px 8px 0 0;opacity:.92;box-shadow:0 0 16px -2px rgba(255,255,255,.25)}
.rcol i:hover{opacity:1}
.rbar span{font-size:12px;color:var(--eb-dim);white-space:nowrap}
.resbig{font-size:36px;font-weight:800;line-height:1.1;color:var(--eb-text)}
.resbig small{font-size:18px;font-weight:700;margin-left:3px;color:var(--eb-muted)}
.reslab2{font-size:16px;color:var(--eb-muted);margin-top:2px}
.resper{font-size:14px;font-weight:500;color:var(--eb-muted);white-space:nowrap}
.ressave .resbig{font-size:32px;white-space:nowrap}
.resself{display:flex;align-items:center;gap:18px;padding-bottom:18px}
.resnum .resself{margin-left:auto;padding-bottom:0;font-size:16px}
.resring{position:relative;flex:none;width:96px;height:96px}
.resring .donut{width:96px;height:96px;display:block;filter:drop-shadow(0 0 7px rgba(52,211,153,.45))}
.resring .mid{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex}
.ressave{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:18px;border-top:1px solid var(--eb-line)}
.ressave .pig{flex:none;display:flex}
.resr>.ressave:first-child{border-top:0;padding-top:0}
.resfoot{margin:22px -28px -24px;padding:16px 28px;border-radius:0 0 var(--eb-radius-card) var(--eb-radius-card);background:var(--eb-tile);border-top:1px solid var(--eb-tile-border);color:var(--eb-muted);font-size:14.5px}
.resfoot b{color:var(--eb-text)}
@media (min-width:960px){
.reshero{grid-template-columns:calc(clamp(300px,28vw,460px) * var(--resx,1)) minmax(0,1fr);align-items:stretch;width:100%}
.resillu{display:block;position:relative;z-index:2;margin-right:-96px;pointer-events:none}
.resghost{position:absolute;left:0;right:150px;top:56px;bottom:52px;border-radius:var(--eb-radius-card);background:var(--eb-panel);border:1px solid var(--eb-tile-border);opacity:.92;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.resillu::before{content:"";position:absolute;left:-10%;right:10%;bottom:-6%;height:70%;background:radial-gradient(60% 60% at 50% 100%,rgba(52,211,153,.22),transparent 70%)}
.resillu svg{position:absolute;left:0;right:0;bottom:-8px;width:100%;height:auto;filter:drop-shadow(0 10px 16px rgba(0,0,0,.55))}
.resillu .flow{filter:drop-shadow(0 0 3px rgba(255,255,255,.18))}
.resillu .glowb{filter:drop-shadow(0 0 4px currentColor)}
.resillu .glowc{filter:drop-shadow(0 0 4px rgba(52,211,153,.95))}
.resillu .glowr{filter:drop-shadow(0 0 5px rgba(255,80,80,.95))}
.resillu .glows{filter:drop-shadow(0 0 10px rgba(255,190,70,.85))}
.resillu .glowp{filter:drop-shadow(0 0 10px rgba(96,165,250,.75))}
.resillu .glowa{filter:drop-shadow(0 0 9px rgba(255,200,100,.8))}
.resfoot{padding-left:112px}
}
@media (max-width:640px){.resgrid,.resgrid.three{grid-template-columns:minmax(0,1fr);row-gap:20px}.resl{padding-right:0;border-right:0}.resm{padding:0;border-right:0}.resr{padding-left:0}.resdrive{margin-left:0;flex-basis:100%}.resnum{font-size:40px}.eb-card.res{padding:18px}.resfoot{margin:18px -18px -18px;padding:14px 18px}}
.tiles.compact{grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin-top:12px}
.tiles.compact .eb-tile{padding:8px 10px}
.tiles.compact .eb-label{font-size:10.5px}
.tiles.compact .eb-value{font-size:17px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:16px}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--eb-muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
svg.hsvg{display:block;max-width:100%;touch-action:pan-y}
.hchart{margin-top:12px}
.hchart .legend{margin:0 0 8px}
.hchart .legend i{border-radius:50%;width:9px;height:9px}
.chartwrap{position:relative}
svg .hgrid{stroke:var(--eb-line);stroke-width:1}
svg .haxis{stroke:var(--eb-dim);stroke-width:1;opacity:.7}
svg .htick,svg .hend{fill:var(--eb-muted);font-size:11px}
svg .hair{stroke:var(--eb-muted);stroke-width:1;stroke-dasharray:3 3}
svg .hdot{stroke:var(--eb-panel);stroke-width:2}
.tip{position:absolute;pointer-events:none;z-index:2;background:var(--eb-panel);border:1px solid var(--eb-tile-border);border-radius:10px;padding:8px 10px;font-size:12.5px;box-shadow:0 6px 18px rgba(0,0,0,.4);white-space:nowrap}
.tip[hidden]{display:none}
.tip.gtip{position:fixed;z-index:50;white-space:normal;max-width:min(380px,92vw)}
.tip .tp{color:var(--eb-text)}
.tip .tp+.tp{color:var(--eb-muted);margin-top:2px}
.bslot{fill:transparent}
.bslot:hover{fill:rgba(128,128,128,.14)}
.tip .tt{color:var(--eb-muted);margin-bottom:4px}
.tip .tr{display:flex;align-items:center;gap:8px}
.tip .tr b{font-weight:600;color:var(--eb-text)}
.tip .tr span{color:var(--eb-muted)}
.tip .tr i{width:9px;height:9px;border-radius:50%;display:inline-block}
.tip .ts{display:flex;gap:8px;padding-left:19px;font-size:11.5px;color:var(--eb-muted)}
.tip .ts span:first-child{min-width:4.5em;text-align:right}
.tip .ts b{margin-left:4px;color:var(--eb-text);font-weight:600}
details.tableview{margin-top:8px;font-size:12.5px;color:var(--eb-muted)}
details.tableview summary{cursor:pointer}
details.tableview table{border-collapse:collapse;margin-top:6px;width:100%}
details.tableview th,details.tableview td{text-align:right;padding:3px 8px;border-top:1px solid var(--eb-line)}
details.tableview th:first-child{text-align:left;font-weight:400}
:host{--ea-prod:#ff9800;--ea-feed:#8353d1;--ea-bout:#4db6ac;--ea-bin:#f06292;--ea-direct:#ffd700;--ea-grid:#488fc2;--ea-house:#cfd8dc}
.axis{fill:var(--eb-dim);font-size:11px}
.empty{padding:40px 0;text-align:center;color:var(--eb-muted)}
.state{color:var(--eb-green)}
.dev{margin-top:14px}
.dev .line{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.dev .name{display:flex;align-items:center;min-width:0}
.nt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.dev .ico,.mn .ico{--mdc-icon-size:18px;flex:none;margin-right:8px;color:var(--eb-muted)}
.dev .dot,.mn .dot{display:inline-block;flex:none;width:9px;height:9px;border-radius:50%;margin-right:8px}
.dev .edit{border:0;background:none;color:var(--eb-dim);cursor:pointer;padding:2px 6px;margin-left:4px;opacity:.55;flex:none;font-size:14px;line-height:1;--mdc-icon-size:16px}
.dev:hover .edit,.dev .edit:focus-visible{opacity:1;color:var(--eb-text)}
.dev .rename{flex:1 1 auto;min-width:0;max-width:420px;font:inherit;background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-green);border-radius:8px;padding:3px 8px}
.dev .rename:focus{outline:none}
.dev .cnt{color:var(--eb-dim);font-size:12px;margin-left:6px;flex:none;white-space:nowrap}
.dev .val{font-weight:700;white-space:nowrap}
.dev .val small{font-weight:500;color:var(--eb-muted);margin-left:3px}
.dev .val small.pct{margin-left:10px;color:var(--eb-muted);display:inline-block;min-width:36px;text-align:right}
.dev .track{height:6px;border-radius:3px;background:var(--eb-line);margin:6px 0 12px;overflow:hidden}
.dev .fill{height:100%;border-radius:3px;background:var(--eb-green);transition:width .6s}
.dev .fill.other{background:var(--eb-dim)}
.dev .line.open{cursor:pointer}
.dev .line.open:hover .nt{color:var(--eb-green)}
.dev .chev{--mdc-icon-size:18px;flex:none;margin-right:4px;margin-left:-4px;color:var(--eb-dim);font-size:11px;transition:transform .2s;display:inline-block}
.dev .chev.on{transform:rotate(90deg)}
.dev .subs{margin:0 0 12px 26px;border-left:2px solid var(--eb-line);padding-left:12px}
.dev .subs .s{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:3px 0;color:var(--eb-muted)}
.dev .subs .s.idle{color:var(--eb-dim)}
.dev .subs .s .sn{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dev .subs .s b{font-weight:600;color:var(--eb-text);white-space:nowrap}
.dev .subs .s.idle b{color:var(--eb-dim)}
.tab{white-space:nowrap}
.set .sec{margin-bottom:var(--eb-gap)}
.eb-card.pvnote{border-color:var(--eb-green);background:radial-gradient(120% 90% at 0% 0%,rgba(52,211,153,.14),transparent 60%),var(--eb-panel);margin-bottom:var(--eb-gap)}
.pvnote .pvq{font-size:16px;font-weight:600;margin:10px 0 6px}
.pvnote ul{margin:0 0 4px;padding-left:20px;color:var(--eb-muted);font-size:14px}
.pvnote .bar2{margin-top:12px}
.pvnote ul.ints{margin:10px 0 0;padding-left:20px;color:var(--eb-muted);font-size:14px}
.fld{margin-top:16px}
.fld>label,.sw{display:block;font-size:12.5px;color:var(--eb-muted);margin-bottom:6px}
.sw{display:flex;align-items:center;gap:10px;margin:16px 0 0;color:var(--eb-text);font-size:14px;cursor:pointer}
.sw input{accent-color:var(--eb-green);width:18px;height:18px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:999px;padding:4px 6px 4px 12px;font-size:13px;max-width:100%}
.histtab{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:13px}
.histtab th{text-align:left;font-weight:600;color:var(--eb-muted);padding:4px 6px}
.histtab td{padding:4px 6px;border-top:1px solid var(--eb-tile-border)}
.histadd{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.histadd input{flex:1 1 90px;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--eb-tile-border);background:var(--eb-tile);color:inherit;font:inherit}
.ykind{margin-top:10px}
.ibtn{border:0;background:none;color:var(--eb-muted);cursor:pointer;padding:4px 6px;border-radius:8px;font-size:15px;line-height:1}
.ibtn:hover{color:var(--eb-text);background:var(--eb-tile)}
.ibtn[data-histrm]:hover{color:var(--eb-red)}
.ibtn ha-icon{--mdc-icon-size:18px}
.histtab td.acts{text-align:right;white-space:nowrap}
.histtab tr.on td{background:var(--eb-tile)}
.histadd select{flex:1 1 110px;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--eb-tile-border);background:var(--eb-tile);color:inherit;font:inherit}
.yrow{display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;padding:5px 0;font-size:13px}
.ytrack{background:var(--eb-tile);border-radius:6px;height:12px;overflow:hidden}
.ytrack i{display:block;height:100%;background:var(--ea-house);opacity:.45;border-radius:6px}
.yrow.on .ytrack i{opacity:1}
.yrow.on .yname,.yrow.on .yval{font-weight:700}
.yval{font-variant-numeric:tabular-nums;text-align:right}
.tags{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:10px;padding:6px 8px;min-height:44px;cursor:text}
.tags:focus-within{border-color:var(--eb-green)}
.tags.cap{max-height:130px;overflow:auto}
.set .tags input[type=text]{flex:1 1 150px;width:auto;min-width:150px;border:0;background:none;padding:5px 4px}
.set .tags input[type=text]:focus{outline:none}
.devsec .fields{grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch}
.devsec .fld{display:flex;flex-direction:column}
.devsec .fld>.tags{flex:1;min-height:104px;max-height:132px;overflow:auto;align-content:flex-start}
.devsec .fld.span>.tags{flex:none;min-height:44px}
.devsec .fld.note{margin-top:8px;font-size:12.5px;color:var(--eb-muted)}
@media (max-width:1100px){.devsec .fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.devsec .fields{grid-template-columns:minmax(0,1fr)}.devsec .fld>.tags{min-height:44px}}
.mtoggle{display:flex;align-items:center;gap:10px;width:100%;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:10px;padding:10px 12px;color:var(--eb-text);font:14px var(--eb-font);cursor:pointer;text-align:left}
.mtoggle .chev{font-size:11px;color:var(--eb-dim);display:inline-block;transition:transform .2s}
.mtoggle .chev.on{transform:rotate(90deg)}
.mtoggle .go{margin-left:auto;color:var(--eb-green);font-weight:600;font-size:13px}
.trow{display:flex;align-items:center;gap:12px;margin:6px 0}
.snorm{margin-right:10px;padding:3px 10px;font-size:12px}
.snorm.on{border-color:var(--eb-dim);color:var(--eb-muted)}
.msens{margin-left:auto;flex:none;align-self:center}
.mrow .msens.on{border-color:var(--eb-green);color:var(--eb-green)}
.trow.dsetup input[type=text]{flex:1 1 180px;min-width:0;max-width:300px;background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-tile-border);border-radius:10px;padding:7px 10px;font:14px var(--eb-font)}
.trow.dsetup .tn{flex:0 1 300px;color:var(--eb-dim);font-size:12.5px}
.trow .tn{font-size:14px;flex:0 1 220px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trow select{flex:1 1 220px;min-width:0;max-width:420px;background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-tile-border);border-radius:10px;padding:8px 10px;font:14px var(--eb-font)}
.chip button{border:0;background:none;color:var(--eb-muted);cursor:pointer;font-size:16px;line-height:1;padding:0 4px}
.chip button:hover{color:var(--eb-red)}
.set input[type=text]{width:100%;background:var(--eb-tile);border:1px solid var(--eb-tile-border);border-radius:10px;padding:9px 12px;color:var(--eb-text);font:14px var(--eb-font)}
.set input[type=text]:focus{outline:none;border-color:var(--eb-green)}
.mlist{max-height:340px;overflow:auto;border:1px solid var(--eb-tile-border);border-radius:10px;margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
.mrow{display:flex;align-items:center;gap:10px;padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--eb-line);min-width:0}
.mrow input{accent-color:var(--eb-green);flex:none}
.mt{display:flex;flex-direction:column;min-width:0}
.mn{display:flex;align-items:center;min-width:0}
.mi{color:var(--eb-dim);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow.ex .mn{color:var(--eb-dim);text-decoration:line-through}
.segs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
.segs .seglab{font-size:12px;color:var(--eb-dim);margin-right:2px}
.segs .sep{width:1px;height:20px;background:var(--eb-line);margin:0 6px}
.seg{border:1px solid var(--eb-tile-border);background:var(--eb-tile);color:var(--eb-muted);border-radius:999px;padding:5px 12px;font:600 12.5px var(--eb-font);cursor:pointer}
.seg small{font-weight:500;margin-left:3px;color:var(--eb-dim)}
.seg.on{color:var(--eb-text);border-color:var(--eb-green);background:rgba(52,211,153,.12)}
.seg.on small{color:var(--eb-muted)}
.mbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.mbar .btn{padding:7px 12px;font-size:12.5px}
.devlist{max-height:480px;overflow:auto}
.linkbtn{border:0;background:none;color:var(--eb-green);font:600 13px var(--eb-font);cursor:pointer;padding:6px 0}
.hint{color:var(--eb-muted);font-size:12.5px;margin-top:6px}
.ferr{color:var(--eb-orange);font-size:12.5px;margin-top:4px}
.bar2{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:var(--eb-gap)}
.btn{border:0;border-radius:12px;padding:10px 18px;font:600 14px var(--eb-font);cursor:pointer;background:var(--eb-green);color:#06281d}
.btn.ghost{background:var(--eb-tile);color:var(--eb-text);border:1px solid var(--eb-tile-border)}
.btn[disabled]{opacity:.4;cursor:default}
.msg{font-size:13px;color:var(--eb-green)}
.msg.err{color:var(--eb-red)}
.note{font-size:12.5px;color:var(--eb-muted)}
.srcs .sblock{margin-top:14px}
.srcs .shead{font-weight:600;font-size:14px}
.srcs .shead small,.srcs .sname small{display:block;font-weight:400;font-size:12px;color:var(--eb-muted);overflow-wrap:anywhere}
.srcs .sgroup{margin:10px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--eb-muted)}
.srcs .srow{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--eb-tile-border);font-size:14px;cursor:pointer}
.srcs .srow input{accent-color:var(--eb-green);width:18px;height:18px}
.srcs .srow.off .sname,.srcs .srow.off .sval{opacity:.5;text-decoration:line-through}
.srcs .sval{font-variant-numeric:tabular-nums;color:var(--eb-muted)}
.srcs .sstate{font-size:12px;color:var(--eb-muted);min-width:84px;text-align:right}
@media (max-width:520px){.srcs .srow{grid-template-columns:auto 1fr auto}.srcs .sstate{display:none}}
.warn{color:var(--eb-orange)}
@media (max-width:640px){
.row{flex-wrap:wrap;row-gap:2px}
.dev .line{gap:8px}
.dev .name{flex:1 1 0;flex-wrap:wrap;row-gap:0;align-items:baseline}
.nt{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}
.dev .cnt{flex-basis:100%;margin:1px 0 0;white-space:normal}
.dev .val{flex:none}
.dev .val .spk:not(.big){width:52px;height:20px;margin-right:6px}
.dev .val small.pct{margin-left:6px;min-width:30px}
.snorm{padding:2px 8px;font-size:11px;margin-right:6px}
.lc{grid-template-columns:minmax(0,1fr) repeat(4,auto);gap:6px;font-size:13px}
.lc .nm{white-space:normal}
.dtop{gap:14px}
.dring{width:104px}
.dlegend{gap:6px 14px}
}
@media (max-width:900px){
.top{grid-template-columns:auto minmax(0,1fr) auto;gap:8px}
.top .left:empty{display:none}
.tabs{min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:none;padding:8px 12px;font-size:13px}
.top .tabs{justify-self:stretch}
}
`;

// English is the base language, German is the only translation.
const STRINGS = {
  en: {
    house: "House",
    tabPower: "Power",
    uTodayKwh: "{kwh} kWh today",
    uFactEnergy: "Energy",
    uFactCost: "Cost",
    uFactCostEv: "Cost (EV Assistant, with the solar share)",
    src_home_cost: "Cost of the home charging (cumulative, with the real price of every charging session)",
    uFactAvg: "Average power",
    uFactPeak: "Peak",
    uFactBase: "Always on",
    uFactRun: "Running now for",
    alTitle: "Notices",
    alFault: "Plant fault{plants}",
    alNegPrice: "The electricity price is negative ({price} ct/kWh): using power now pays",
    alLongRun: "{name} has been running for {dur} ({power})",
    alBase: "The base load is high: {now} W, usually about {ref} W",
    f_battery_soc: "Storage charge level sensor (%)",
    f_battery_soc_more: "Further storages: charge level sensors (%, one battery each in the results)",
    f_battery_capacity: "Storage capacity (kWh)",
    f_battery_min_soc: "Minimum charge level (%)",
    f_cost_grid_only: "Price every kWh at the grid price (ignore the solar share)",
    h_cost_mix: "The cost sensors of devices, labels and areas price a kWh by what the grid delivers at that moment: own solar power only costs the feed-in tariff that is lost by using it (with 100 % self-sufficiency that is all), grid power costs the price of the contract. Tick this to price everything at the grid price as before.",
    f_ev_consumption: "Electric car: consumption (kWh per 100 km, for the kilometres of the results)",
    liveTitle: "Right now",
    liveHouse: "Consumption now",
    liveFeed: "Feed-in",
    resPerHour: "per hour",
    resToday: "today",
    liveFootSelf: "Right now you cover **{pct} %** of your electricity needs yourself.",
    liveFootToday: "You have covered **{pct} %** of your electricity needs with solar today.",
    resTitle: "Your results",
    resCost: "Electricity cost",
    resSaving: "Savings",
    resYield_day: "Daily yield",
    resYield_week: "Weekly yield",
    resYield_month: "Monthly yield",
    resYield_year: "Annual yield",
    resPer_day: "per day",
    resPer_week: "per week",
    resPer_month: "per month",
    resPer_year: "per year",
    resDrive: "Driving",
    resKmElectric: "km electric",
    resFootKm: "**{km} km** you drive electrically ({kwh} kWh charged at home).",
    resFootEv: "Your electric car charged **{kwh} kWh** at home.",
    resFootSelf: "You cover **{pct} %** of your electricity needs yourself.",
    resSavingTip: "Solar power used directly plus power from the storage, at the price of your contract minus the lost feed-in revenue (storage: plus its losses)",
    pvSoc: "Storage: charge level sensor{cap}",
    stTitle: "Storage",
    stUnit: "Storage {n}",
    stTotal: "Total",
    stEmptyAt: "Empty at",
    stFullAt: "Full at",
    stIn: "in {dur}",
    stDur: "{h} h {m} min",
    stDurMin: "{m} min",
    tabUsage: "Consumption",
    uBaseTitle: "Base load",
    uBase: "Base load",
    uBaseHint: "Lowest 30-minute average of the house power in the last 24 hours.",
    uPerYear: "Per year",
    uCostYear: "Cost per year",
    uExplained: "Always-on devices",
    uOfBase: "{pct} % of the base load",
    uTopTitle: "Biggest consumers",
    uLabelsTitle: "Labels",
    costsPeriod: "Costs in the period",
    f_device_ids: "Devices with their own sensors",
    devSensorsBtn: "Sensors",
    devSensorsTip: "Give this device its own energy and cost sensors",
    deviceCounter: "{n} devices with their own sensors: {sensors} sensors (four for the energy, four for the cost with Tariffy per device). Untick a device to delete its sensors when you save.",
    deviceCounterNone: "Nothing is selected at first, so no sensors are created: tick the devices you need in the list above with the Sensors button. Every device gets four energy sensors and, with Tariffy, four cost sensors.",
    f_device_setup: "Name and tariff of these devices",
    h_device_setup: "The name is the display name of the device and is part of the sensor names. The field shows the name of the device (the display name, else the name of the sensor without the word Leistung) and the sensors get exactly this name; change it as you like and it changes everywhere. A name changed later changes the name of the sensors, but not their entity id. A device whose source is gone or excluded keeps its sensors until you untick it.",
    deviceNameLabel: "Name of the device",
    deviceCostTitle: "Cost per device",
    uNormal: "Normal",
    uNormalTip: "This standby load is wanted (it should run all the time): it does not count as avoidable.",
    uNormalOnTip: "Marked as normal. Click to count it as avoidable again.",
    uNormalHint: "Mark the loads that are meant to run all the time (server, fridge) as Normal; the rest is what you could switch off.",
    uAvoidableCost: "Avoidable: {w} · {kwh} kWh · {cost} per year",
    uAvoidableKwh: "Avoidable: {w} · {kwh} kWh per year",
    uAvoidableTip: "The standby loads that are not marked as normal, extrapolated to a year.",
    uAvoidableTile: "Avoidable standby",
    tabDevices: "Devices",
    devTitle: "Devices",
    devUnassigned: "not assigned",
    devOfHouse: "{pct} % of the house",
    devPerDay: "{v} kWh per day",
    devNoLabels: "The Devices tab groups the devices by label: select the labels you need in the settings (Labels).",
    devNoData: "No energy of the devices of these labels in this period (the power sensors need the state class measurement).",
    uDevicesTitle: "Devices with sensors",
    uDevicesHint: "Energy of the devices that have their own sensors (Sensors button in the settings) in the shown period, from the long-term statistics of Home Assistant (hourly means of the power times their duration; the power sensors need the state class measurement). The sensors themselves count from the moment they were created.",
    uAreasTitle: "Areas",
    uAreasHint: "Energy of the sensors in the area in the shown period, from the long-term statistics of Home Assistant (hourly means of the power times their duration; the power sensors need the state class measurement). Energy Assistant also creates energy sensors per selected area for dashboards and automations, they count from the moment they were created.",
    areaCostTitle: "Cost per area",
    h_label_sensors: "Every selected label gets four consumption sensors (day, week, month, year) and, with Tariffy, four cost sensors. Nothing is selected at first, so no sensors are created: select only the labels you need.",
    h_area_sensors: "Every selected area gets four consumption sensors (day, week, month, year) and, with Tariffy, four cost sensors. Nothing is selected at first, so no sensors are created; with no selection the Areas card on the Power tab shows all areas, but no sensors exist.",
    f_area_tariffs: "Tariff per area (for the cost sensors)",
    h_area_tariffs: "Which Tariffy electricity contract prices the cost of an area. The cost sensors count with the price of that contract from then on; what was counted before stays.",
    labelCostTitle: "Cost per label",
    labelCostHint: "Cost of the label sensors, priced step by step with the unit price valid at that moment. A tariff change does not change what was already counted. The sensors count from the moment they were created. This table always shows the running day, week, month and year, whatever period is chosen above.",
    uLabelsHint: "Energy of the sensors that carry the label in the shown period, from the long-term statistics of Home Assistant (hourly means of the power times their duration; the power sensors need the state class measurement). Energy Assistant also creates energy sensors per label for dashboards and automations, they count from the moment they were created.",
    uLabelsCoverage: "{n} of {m} sensors",
    uLabelsCoverageTip: "Only these sensors have statistics; the others are not counted.",
    uBaseHintStat: "Lowest hourly mean of the house power in the period (at most the last 31 days).",
    uAlwaysHintStat: "Lowest hourly mean of each device in the period (at most the last 31 days), from 2 W on.",
    uNeedStats: "Past periods come from the long-term statistics: the power sensors need the state class measurement.",
    uAlwaysTitle: "Always on (standby)",
    uAlwaysDefined: "The standby devices you defined in the settings, with their lowest power in the period.",
    uAlwaysHint: "Lowest 30-minute average of each device in the last 24 hours, from 2 W on.",
    uYear: "{kwh} kWh · {cost} per year",
    uYearKwh: "{kwh} kWh per year",
    uNone: "Not enough data yet",
    tabBalance: "Balance",
    sectionEnergy: "Energy counters (kWh)",
    f_energy_solar: "PV production",
    f_energy_grid_import: "Grid import",
    f_energy_grid_export: "Grid export",
    f_energy_battery_charge: "To storage (charging)",
    f_energy_battery_discharge: "From storage (discharging)",
    f_energy_house: "House consumption (optional, otherwise calculated)",
    f_history_years: "Past years (entered by hand)",
    histHint: "Energy of past years that Home Assistant has no statistics for. It only shows in the year view; existing statistics always win.",
    histKind: "What",
    histHouse: "Consumption",
    histSolar: "Production",
    histImport: "Grid import",
    histExport: "Feed-in",
    histEdit: "Edit",
    histApply: "Apply",
    histCancel: "Cancel",
    histYear: "Year",
    histKwh: "kWh",
    histCost: "Cost (optional)",
    histAdd: "Add",
    histInvalid: "Enter a year (1990 or later, not in the future) and an energy above 0 kWh.",
    bManual: "Entered by hand",
    bManualNote: "Some values of this year are the ones you entered; Home Assistant has no statistics for them.",
    bYearsTitle: "Energy per year",
    bCostYear: "Cost",
    energyHint: "Cumulative kWh counters or utility meters. The Balance tab reads their long-term statistics, so the history that already exists is used.",
    energyAsk: "The Energy dashboard of Home Assistant has counters. Do you want to take them over?",
    energyApply: "Take over counters",
    energyDone: "The counters of the Energy dashboard are in use.",
    energyOverwrite: "This replaces the counters in these fields. Save afterwards to keep them.",
    balTitle: "Balance",
    balChart: "Energy per period",
    bDay: "Day",
    bWeek: "Week",
    bMonth: "Month",
    bYear: "Year",
    bPrev: "Previous period",
    bNext: "Next period",
    bSolar: "Production",
    bImport: "Grid import",
    bExport: "Feed-in",
    bCharge: "To storage",
    bDischarge: "From storage",
    bDirect: "Solar direct",
    bHouse: "Consumption",
    bAutarky: "Self-sufficiency",
    bSelf: "Self-consumption",
    bCost: "Grid cost",
    bRevenue: "Feed-in revenue",
    bSaldo: "Balance",
    bVs_day: "{arrow} {pct} % vs. yesterday",
    bVs_day_past: "{arrow} {pct} % vs. the day before",
    bVs_week: "{arrow} {pct} % vs. last week",
    bVs_week_past: "{arrow} {pct} % vs. the week before",
    bVs_month: "{arrow} {pct} % vs. last month",
    bVs_month_past: "{arrow} {pct} % vs. the month before",
    bVs_year: "{arrow} {pct} % vs. last year",
    bVs_year_past: "{arrow} {pct} % vs. the year before",
    bNoData: "No data for this period",
    bPriceNote: "Valued with the price of the Tariffy contract.",
    bTime: "Period",
    bSum: "Sum",
    autarky: "Self-sufficiency",
    tabPv: "PV",
    tabEv: "EV",
    tabCosts: "Costs",
    tabAmortix: "Payback",
    tContract: "Contract",
    tCostSoFar: "Cost so far",
    tBalance: "Balance so far",
    tForecast: "Balance at contract end",
    rename: "Rename",
    originalName: "Original: {name}",
    live: "Live consumption",
    history: "History",
    historyLoading: "Loading history …",
    noHistory: "No history available yet",
    chartLabel: "Power over the last 24 hours (W)",
    hProd: "Production",
    hFeed: "Feed-in",
    hFromStorage: "From storage (+)",
    hToStorage: "To storage (−)",
    hStorage: "Storage",
    hStorageNet: "Storage (+ discharge / − charge)",
    hDischarge: "From storage",
    hCharge: "To storage",
    hDirect: "Used directly",
    hDirectShort: "Direct",
    hGrid: "Grid import",
    hGridShort: "Grid",
    hHouse: "House consumption",
    hHouseShort: "House",
    hTable: "Show as table",
    hTime: "Time",
    notConfigured:
      "No sensors configured. Open Settings → Devices & services → Energy Assistant.",
    menu: "Menu",
    solar: "Solar",
    solarDirect: "Solar direct",
    gridImport: "Grid import",
    storage: "Storage",
    grid: "Grid",
    devices: "Devices",
    otherDevices: "Other (not measured)",
    idleDevices: "{n} idle",
    share: "{pct} % of house",
    settings: "Settings",
    save: "Save",
    discard: "Discard",
    saved: "Saved",
    saving: "Saving …",
    saveFailed: "Could not save: {error}",
    adminOnly: "Only administrators can change the settings.",
    noSource: "Grid import, grid combined or house consumption is required.",
    addSensor: "Add sensor …",
    unknownSensor: "Unknown sensor: {id}",
    remove: "Remove",
    loading: "Loading …",
    sectionGrid: "Grid and house",
    sectionSolar: "Solar and storage",
    sectionDevices: "Devices",
    f_grid_power: "Grid combined (import +, export −)",
    f_invert_grid: "Invert grid sign",
    f_grid_import: "Grid import separate",
    f_grid_export: "Grid export separate",
    f_house_power: "House consumption directly (optional)",
    f_solar_power: "Solar production",
    f_battery_power: "Storage combined (discharge +, charge −)",
    f_invert_battery: "Invert storage sign",
    f_battery_discharge: "From storage (discharging)",
    f_battery_charge: "To storage (charging)",
    f_battery_grid_charge: "Storage charged from grid",
    f_device_power: "Additional device sensors (optional)",
    f_device_standby: "Standby devices",
    f_alert_exclude: "No notices for these devices",
    h_alert_exclude: "These devices never trigger a notice about running for hours or using more than usual (for example the wallbox).",
    alUnusual: "{name} has been using more than usual for {hours} hours: on average {now} (usually up to {ref})",
    f_label_tariffs: "Tariff per label (for the cost sensors)",
    h_label_tariffs: "Which Tariffy electricity contract prices the cost of a label, e.g. the heat pump tariff for the heat pump label. The cost sensors count with the price of that contract from then on; what was counted before stays.",
    tariffDefault: "Default ({name})",
    h_device_standby: "Standby devices are shown as always on in the Consumption tab. None selected = detected automatically.",
    f_device_patterns: "Name patterns for device sensors",
    addPattern: "e.g. *_power",
    invalidPattern: "Only letters, digits, _ . * and ? are allowed.",
    matchesCount: "{n} matching, {x} excluded. Untick a sensor to exclude it.",
    matchesSummary: "{n} matching sensors, {x} excluded",
    matchesShow: "Show list",
    matchesHide: "Hide list",
    filterMatches: "Filter matches …",
    filterAll: "All",
    filterGroupState: "Activity",
    filterGroupSel: "Selection",
    filterSelected: "Selected",
    filterUnselected: "Not selected",
    filterLabels: "Filter labels …",
    noLabelMatches: "No label matches the filters",
    sectionAreas: "Areas",
    f_area_ids: "Areas (their power sensors are summed up per area)",
    filterAreas: "Filter areas …",
    noAreaMatches: "No area matches the filters",
    noPowerAreas: "No area has power sensors yet. Assign your power sensors or their devices to an area.",
    noAreasDefined: "No areas exist in Home Assistant yet. Create them under Settings → Areas, labels & zones.",
    amTitle: "Payback",
    aSavings: "Savings total",
    aInvest: "Investment",
    aProgress: "Progress",
    aRemaining: "Remaining",
    aPerDay: "Savings per day",
    aDays: "Time left",
    aDaysUnit: "days",
    aDate: "Payback date",
    pvDayTitle: "PV today and tomorrow",
    pvToday: "Today",
    pvTomorrow: "Tomorrow",
    dProduction: "Production",
    dFeedIn: "Feed-in",
    dSelf: "Self-consumption",
    dAutarky: "Self-sufficiency",
    dForecast: "Forecast reached",
    dBenefit: "Benefit",
    dExpected: "Expected feed-in",
    dWindow: "Best window",
    dStorageTitle: "Storage",
    dStorage: "Storage usable",
    dEmptyAt: "Storage empty at",
    dFault: "Plant fault",
    evWallbox: "Wallbox",
    evCharging: "Charging",
    evConnected: "Connected",
    evIdle: "Not connected",
    evSoc: "Charge level",
    evSolar: "Solar share",
    evToday: "Charged today",
    evCostToday: "Charging cost today",
    evAdvice: "Charge before PV is recommended",
    costsNow: "Costs right now",
    tPrice: "Electricity price",
    tGridCost: "Grid import costs",
    tFeedIn: "Feed-in earns",
    tPvSaves: "Solar saves",
    pvPlants: "PV by plant",
    intTitle: "Detected integrations",
    intPv: "PV Assistant",
    intPvData: "PV Assistant: day figures, forecast and plant fault in the PV tab",
    intTariffy: "Tariffy: electricity price, costs and contract in the Costs tab",
    intEv: "EV Assistant: wallbox and today's charging in the EV tab ({n})",
    intAmortix: "Amortix: savings and payback in the Payback tab",
    pvTitle: "PV Assistant detected",
    pvAsk: "PV Assistant is installed. Do you want to take over its sensors?",
    pvSolar: "Solar production: {n} sensors",
    pvStorage: "Storage: {parts}",
    pvCombined: "combined {n}",
    pvCharge: "charging {n}",
    pvDischarge: "discharging {n}",
    pvGrid: "Grid: {parts}",
    pvImport: "import {n}",
    pvExport: "feed-in {n}",
    pvFeedInfo: "The feed-in sensor of PV Assistant reports feed-in as negative values. It is used as the combined grid sensor (import +, feed-in −).",
    pvAbsInfo: "Charging and discharging sensors that report negative values count with their magnitude.",
    pvApply: "Take over sensors",
    pvOverwrite: "This replaces the sensors in these fields. Save afterwards to keep them.",
    pvDone: "The sensors of PV Assistant are in use.",
    areaAutoHint: "Nothing selected: all areas with power sensors are shown. Select areas to show only these.",
    noPowerLabels: "No label has power sensors yet. Add a label to your power sensors under Settings → Areas, labels & zones.",
    filterActive: "Active",
    filterIdle: "Inactive",
    filterIncluded: "Included",
    filterExcluded: "Excluded",
    filterActiveTip: "At least 5 W right now",
    filterIdleTip: "Below 5 W or no value",
    excludeShown: "Exclude shown",
    includeShown: "Include shown",
    showAll: "Show all {n}",
    showLess: "Show less",
    areas: "Areas",
    noArea: "No area",
    labels: "Labels",
    sectionSources: "Sources from other integrations",
    h_source_list: "These sensors come from Tariffy, EV Assistant, PV Assistant and Amortix. Energy Assistant only reads them. Everything is used at first; untick a sensor to stop using it (for example a second wallbox row in the device list).",
    srcNone: "No sensors of Tariffy, EV Assistant, PV Assistant or Amortix were found.",
    srcInt_tariffy: "Tariffy",
    srcInt_ev_assistant: "EV Assistant",
    srcInt_pv_assistant: "PV Assistant",
    srcInt_amortix: "Amortix",
    srcUse_tariffy: "price per kWh for costs and savings, feed-in revenue, Costs tab",
    srcUse_ev_assistant: "car in the Power tab and the picture, EV tab, wallbox row in the device list",
    srcUse_pv_assistant: "PV day figures, forecast and notices in the PV tab",
    srcUse_amortix: "savings and payback in the Amortix tab",
    srcUsed: "in use",
    srcOff: "not used",
    src_arbeitspreis: "Electricity price",
    src_einspeiseverguetung: "Feed-in tariff",
    src_kosten_bisher: "Costs so far",
    src_guthaben_bisher: "Balance so far",
    src_prognose_real: "Forecast",
    src_home_kwh: "Home charging total (its attributes carry the live data of the wallbox)",
    src_kwh_day: "Energy charged today",
    src_cost_day: "Cost of today",
    src_charge_before_pv_recommended: "Advice: charge before the sun",
    src_wallbox_power: "Power sensor of the wallbox (also the wallbox row in the device list)",
    src_production_today: "Production today",
    src_feed_in_today: "Feed-in today",
    src_self_consumption_rate_today: "Self-consumption today",
    src_autarky_today: "Self-sufficiency today",
    src_benefit_today: "Benefit today",
    src_forecast_reached_today: "Forecast reached today",
    src_expected_feed_in_tomorrow: "Expected feed-in tomorrow",
    src_best_window_tomorrow: "Best window tomorrow",
    src_storage_usable: "Usable storage energy",
    src_storage_roundtrip_total: "Storage round-trip efficiency",
    src_storage_empty_at: "Storage empty at",
    src_string_fault: "Plant fault",
    src_einsparung: "Savings total",
    src_investition: "Investment",
    src_fortschritt: "Payback progress",
    src_verbleibend: "Remaining",
    src_tagesschnitt: "Savings per day",
    src_resttage: "Days to payback",
    src_datum: "Payback date",
    sectionLabels: "Labels",
    f_label_ids: "Labels (their power sensors are summed up per label)",
    noLabelsDefined: "No labels exist in Home Assistant yet. Create them under Settings → Areas, labels & zones.",
    labelSensors1: "1 power sensor",
    labelSensorsN: "{n} power sensors",
    deviceCount1: "1 device",
    deviceCountN: "{n} devices",
    f_device_exclude: "Excluded sensors (never added by a pattern)",
    f_device_exclude_patterns: "Exclude patterns",
    addExcludePattern: "e.g. alpha_ess_*",
    excludedByPattern: "Excluded by an exclude pattern",
    noMatches: "No power sensor matches yet",
  },
  de: {
    house: "Haus",
    tabPower: "Leistung",
    uTodayKwh: "{kwh} kWh heute",
    uFactEnergy: "Energie",
    uFactCost: "Kosten",
    uFactCostEv: "Kosten (EV Assistant, mit PV-Anteil)",
    src_home_cost: "Kosten des Heimladens (kumuliert, mit dem echten Preis jeder Ladesitzung)",
    uFactAvg: "Durchschnittsleistung",
    uFactPeak: "Spitze",
    uFactBase: "Dauerlast",
    uFactRun: "Läuft seit",
    alTitle: "Hinweise",
    alFault: "Anlagenstörung{plants}",
    alNegPrice: "Der Strompreis ist negativ ({price} ct/kWh): Verbrauchen lohnt sich jetzt",
    alLongRun: "{name} läuft seit {dur} ({power})",
    alBase: "Die Grundlast ist hoch: {now} W, sonst etwa {ref} W",
    f_battery_soc: "Ladestand-Sensor des Speichers (%)",
    f_battery_soc_more: "Weitere Speicher: Ladestand-Sensoren (%, je eine Batterie in den Ergebnissen)",
    f_battery_capacity: "Speicherkapazität (kWh)",
    f_battery_min_soc: "Mindest-Ladestand (%)",
    f_cost_grid_only: "Jede kWh zum Netzpreis rechnen (Solaranteil ignorieren)",
    h_cost_mix: "Die Kostensensoren von Geräten, Labels und Bereichen bewerten eine kWh nach dem, was das Netz in dem Moment liefert: eigener Solarstrom kostet nur die Einspeisevergütung, die durch das Verbrauchen entgeht (bei 100 % Autarkie ist das alles), Netzstrom kostet den Preis des Vertrags. Hake das an, um wie bisher alles zum Netzpreis zu rechnen.",
    f_ev_consumption: "E-Auto: Verbrauch (kWh pro 100 km, für die Kilometer der Ergebnisse)",
    liveTitle: "Jetzt",
    liveHouse: "Verbrauch jetzt",
    liveFeed: "Einsp.",
    resPerHour: "pro Stunde",
    resToday: "heute",
    liveFootSelf: "Gerade decken Sie **{pct} %** Ihres Strombedarfs selbst.",
    liveFootToday: "Du hast heute **{pct} %** deines Strombedarfs durch PV gedeckt.",
    resTitle: "Ihre Ergebnisse",
    resCost: "Stromkosten",
    resSaving: "Einsparung",
    resYield_day: "Tagesertrag",
    resYield_week: "Wochenertrag",
    resYield_month: "Monatsertrag",
    resYield_year: "Jahresertrag",
    resPer_day: "am Tag",
    resPer_week: "pro Woche",
    resPer_month: "pro Monat",
    resPer_year: "jährlich",
    resDrive: "Fahren",
    resKmElectric: "km elektrisch",
    resFootKm: "**{km} km** fahren Sie elektrisch ({kwh} kWh zu Hause geladen).",
    resFootEv: "Ihr Elektroauto hat **{kwh} kWh** zu Hause geladen.",
    resFootSelf: "Sie decken **{pct} %** Ihres Strombedarfs selbst.",
    resSavingTip: "Direkt genutzter Solarstrom plus Strom aus dem Speicher, zum Preis deines Vertrags abzüglich der entgangenen Einspeisevergütung (Speicher: samt Verlusten)",
    pvSoc: "Speicher: Ladestand-Sensor{cap}",
    stTitle: "Speicher",
    stUnit: "Speicher {n}",
    stTotal: "Gesamt",
    stEmptyAt: "Leer um",
    stFullAt: "Voll um",
    stIn: "in {dur}",
    stDur: "{h} h {m} min",
    stDurMin: "{m} min",
    tabUsage: "Verbrauch",
    uBaseTitle: "Grundlast",
    uBase: "Grundlast",
    uBaseHint: "Niedrigster 30-Minuten-Durchschnitt der Hausleistung der letzten 24 Stunden.",
    uPerYear: "Pro Jahr",
    uCostYear: "Kosten pro Jahr",
    uExplained: "Dauerläufer unter den Geräten",
    uOfBase: "{pct} % der Grundlast",
    uTopTitle: "Größte Verbraucher",
    uLabelsTitle: "Labels",
    costsPeriod: "Kosten im Zeitraum",
    f_device_ids: "Geräte mit eigenen Sensoren",
    devSensorsBtn: "Sensoren",
    devSensorsTip: "Diesem Gerät eigene Verbrauchs- und Kostensensoren geben",
    deviceCounter: "{n} Geräte mit eigenen Sensoren: {sensors} Sensoren (je Gerät vier für den Verbrauch, mit Tariffy vier für die Kosten). Wählst du ein Gerät ab, werden seine Sensoren beim Speichern gelöscht.",
    deviceCounterNone: "Zuerst ist nichts ausgewählt, es werden also keine Sensoren angelegt: wähle die Geräte, die du brauchst, in der Liste oben mit dem Knopf Sensoren. Jedes Gerät bekommt vier Verbrauchssensoren und mit Tariffy vier Kostensensoren.",
    f_device_setup: "Name und Tarif dieser Geräte",
    h_device_setup: "Der Name ist der Anzeigename des Geräts und Teil der Sensornamen. Das Feld zeigt den Namen des Geräts (der Anzeigename, sonst der Name des Sensors ohne das Wort Leistung), und die Sensoren bekommen genau diesen Namen; ändere ihn nach Wunsch, dann ändert er sich überall. Ein später geänderter Name ändert den Namen der Sensoren, aber nicht ihre Entity-ID. Ein Gerät, dessen Quelle fehlt oder ausgeschlossen wurde, behält seine Sensoren, bis du es abwählst.",
    deviceNameLabel: "Name des Geräts",
    deviceCostTitle: "Kosten pro Gerät",
    uNormal: "Normal",
    uNormalTip: "Diese Dauerlast ist gewollt (sie soll immer laufen): sie zählt nicht als vermeidbar.",
    uNormalOnTip: "Als normal markiert. Klicken, damit sie wieder als vermeidbar zählt.",
    uNormalHint: "Markiere die Lasten, die immer laufen sollen (Server, Kühlschrank), als Normal; der Rest ist das, was du abschalten könntest.",
    uAvoidableCost: "Vermeidbar: {w} · {kwh} kWh · {cost} pro Jahr",
    uAvoidableKwh: "Vermeidbar: {w} · {kwh} kWh pro Jahr",
    uAvoidableTip: "Die Dauerlasten, die nicht als normal markiert sind, auf ein Jahr hochgerechnet.",
    uAvoidableTile: "Vermeidbare Dauerlast",
    tabDevices: "Geräte",
    devTitle: "Geräte",
    devUnassigned: "nicht zugeordnet",
    devOfHouse: "{pct} % vom Haus",
    devPerDay: "{v} kWh pro Tag",
    devNoLabels: "Der Tab Geräte gruppiert die Geräte nach Labels: wähle in den Einstellungen (Labels) die Labels, die du brauchst.",
    devNoData: "Kein Verbrauch der Geräte dieser Labels in diesem Zeitraum (die Leistungssensoren brauchen die Zustandsklasse measurement).",
    uDevicesTitle: "Geräte mit Sensoren",
    uDevicesHint: "Verbrauch der Geräte, die eigene Sensoren haben (Knopf Sensoren in den Einstellungen), im gezeigten Zeitraum, aus der Langzeitstatistik von Home Assistant (Stundenmittel der Leistung mal Dauer; die Leistungssensoren brauchen die Zustandsklasse measurement). Die Sensoren selbst zählen ab dem Anlegen.",
    uAreasTitle: "Bereiche",
    uAreasHint: "Verbrauch der Sensoren im Bereich im gezeigten Zeitraum, aus der Langzeitstatistik von Home Assistant (Stundenmittel der Leistung mal Dauer; die Leistungssensoren brauchen die Zustandsklasse measurement). Energy Assistant legt außerdem Verbrauchssensoren pro ausgewähltem Bereich für Dashboards und Automationen an, sie zählen ab dem Anlegen.",
    areaCostTitle: "Kosten pro Bereich",
    h_label_sensors: "Jedes ausgewählte Label bekommt vier Verbrauchssensoren (Tag, Woche, Monat, Jahr) und mit Tariffy vier Kostensensoren. Zuerst ist nichts ausgewählt, es werden also keine Sensoren angelegt: wähle nur die Labels, die du brauchst.",
    h_area_sensors: "Jeder ausgewählte Bereich bekommt vier Verbrauchssensoren (Tag, Woche, Monat, Jahr) und mit Tariffy vier Kostensensoren. Zuerst ist nichts ausgewählt, es werden also keine Sensoren angelegt; ohne Auswahl zeigt die Bereichskarte im Leistung-Tab alle Bereiche, es entstehen aber keine Sensoren.",
    f_area_tariffs: "Tarif pro Bereich (für die Kostensensoren)",
    h_area_tariffs: "Welcher Tariffy-Stromvertrag die Kosten eines Bereichs bewertet. Die Kostensensoren rechnen ab dann mit dem Preis dieses Vertrags; was vorher gezählt wurde, bleibt.",
    labelCostTitle: "Kosten pro Label",
    labelCostHint: "Kosten der Label-Sensoren, Schritt für Schritt mit dem Arbeitspreis des jeweiligen Moments berechnet. Eine Preisänderung ändert nichts an dem, was schon gezählt wurde. Die Sensoren zählen ab dem Anlegen. Diese Tabelle zeigt immer den laufenden Tag, die laufende Woche, den laufenden Monat und das laufende Jahr, egal welcher Zeitraum oben gewählt ist.",
    uLabelsHint: "Verbrauch der Sensoren, die das Label tragen, im gezeigten Zeitraum, aus der Langzeitstatistik von Home Assistant (Stundenmittel der Leistung mal Dauer; die Leistungssensoren brauchen die Zustandsklasse measurement). Energy Assistant legt außerdem Verbrauchssensoren pro Label für Dashboards und Automationen an, sie zählen ab dem Anlegen.",
    uLabelsCoverage: "{n} von {m} Sensoren",
    uLabelsCoverageTip: "Nur diese Sensoren haben Statistik; die anderen zählen nicht mit.",
    uBaseHintStat: "Niedrigster Stundenmittelwert der Hausleistung im Zeitraum (höchstens die letzten 31 Tage).",
    uAlwaysHintStat: "Niedrigster Stundenmittelwert jedes Geräts im Zeitraum (höchstens die letzten 31 Tage), ab 2 W.",
    uNeedStats: "Vergangene Zeiträume kommen aus der Langzeitstatistik: die Leistungssensoren brauchen die State Class measurement.",
    uAlwaysTitle: "Dauerlast (Standby)",
    uAlwaysDefined: "Die Standby-Geräte, die du in den Einstellungen festgelegt hast, mit ihrer niedrigsten Leistung im Zeitraum.",
    uAlwaysHint: "Niedrigster 30-Minuten-Durchschnitt jedes Geräts in den letzten 24 Stunden, ab 2 W.",
    uYear: "{kwh} kWh · {cost} pro Jahr",
    uYearKwh: "{kwh} kWh pro Jahr",
    uNone: "Noch zu wenig Daten",
    tabBalance: "Bilanz",
    sectionEnergy: "Energiezähler (kWh)",
    f_energy_solar: "PV-Erzeugung",
    f_energy_grid_import: "Netzbezug",
    f_energy_grid_export: "Einspeisung",
    f_energy_battery_charge: "In Speicher (Laden)",
    f_energy_battery_discharge: "Aus Speicher (Entladen)",
    f_energy_house: "Hausverbrauch (optional, sonst berechnet)",
    f_history_years: "Vergangene Jahre (von Hand)",
    histHint: "Energie vergangener Jahre, für die Home Assistant keine Statistik hat. Sie erscheint nur in der Jahresansicht; vorhandene Statistik hat immer Vorrang.",
    histKind: "Was",
    histHouse: "Verbrauch",
    histSolar: "Erzeugung",
    histImport: "Netzbezug",
    histExport: "Einspeisung",
    histEdit: "Bearbeiten",
    histApply: "Übernehmen",
    histCancel: "Abbrechen",
    histYear: "Jahr",
    histKwh: "kWh",
    histCost: "Kosten (optional)",
    histAdd: "Hinzufügen",
    histInvalid: "Gib ein Jahr (ab 1990, nicht in der Zukunft) und eine Energie über 0 kWh ein.",
    bManual: "Von Hand eingetragen",
    bManualNote: "Einige Werte dieses Jahres hast du von Hand eingetragen; dafür gibt es keine Statistik in Home Assistant.",
    bYearsTitle: "Energie je Jahr",
    bCostYear: "Kosten",
    energyHint: "Fortlaufende kWh-Zähler oder Utility Meter. Der Tab Bilanz liest deren Langzeitstatistik, der vorhandene Verlauf wird also genutzt.",
    energyAsk: "Das Energie-Dashboard von Home Assistant hat Zähler. Sollen sie übernommen werden?",
    energyApply: "Zähler übernehmen",
    energyDone: "Die Zähler des Energie-Dashboards sind übernommen.",
    energyOverwrite: "Dadurch werden die Zähler in diesen Feldern ersetzt. Danach speichern, damit sie bleiben.",
    balTitle: "Bilanz",
    balChart: "Energie je Zeitraum",
    bDay: "Tag",
    bWeek: "Woche",
    bMonth: "Monat",
    bYear: "Jahr",
    bPrev: "Voriger Zeitraum",
    bNext: "Nächster Zeitraum",
    bSolar: "Erzeugung",
    bImport: "Netzbezug",
    bExport: "Einspeisung",
    bCharge: "In Speicher",
    bDischarge: "Aus Speicher",
    bDirect: "PV direkt",
    bHouse: "Verbrauch",
    bAutarky: "Autarkie",
    bSelf: "Eigenverbrauch",
    bCost: "Netzkosten",
    bRevenue: "Einspeiseerlös",
    bSaldo: "Saldo",
    bVs_day: "{arrow} {pct} % ggü. gestern",
    bVs_day_past: "{arrow} {pct} % ggü. Vortag",
    bVs_week: "{arrow} {pct} % ggü. letzter Woche",
    bVs_week_past: "{arrow} {pct} % ggü. Vorwoche",
    bVs_month: "{arrow} {pct} % ggü. letztem Monat",
    bVs_month_past: "{arrow} {pct} % ggü. Vormonat",
    bVs_year: "{arrow} {pct} % ggü. letztem Jahr",
    bVs_year_past: "{arrow} {pct} % ggü. Vorjahr",
    bNoData: "Keine Daten für diesen Zeitraum",
    bPriceNote: "Bewertet mit dem Preis des Tariffy-Vertrags.",
    bTime: "Zeitraum",
    bSum: "Summe",
    autarky: "Autarkie",
    tabPv: "PV",
    tabEv: "EV",
    tabCosts: "Kosten",
    tabAmortix: "Amortisation",
    tContract: "Vertrag",
    tCostSoFar: "Kosten bisher",
    tBalance: "Guthaben bisher",
    tForecast: "Prognose Vertragsende",
    rename: "Umbenennen",
    originalName: "Original: {name}",
    live: "Verbrauch live",
    history: "Verlauf",
    historyLoading: "Verlauf wird geladen …",
    noHistory: "Noch kein Verlauf verfügbar",
    chartLabel: "Leistung der letzten 24 Stunden (W)",
    hProd: "Erzeugung",
    hFeed: "Einspeisung",
    hFromStorage: "Aus Speicher (+)",
    hToStorage: "In Speicher (−)",
    hStorage: "Speicher",
    hStorageNet: "Speicher (+ Entladen / − Laden)",
    hDischarge: "Aus Speicher",
    hCharge: "In Speicher",
    hDirect: "Direkt verbraucht",
    hDirectShort: "Direkt",
    hGrid: "Netzbezug",
    hGridShort: "Netz",
    hHouse: "Hausverbrauch",
    hHouseShort: "Haus",
    hTable: "Als Tabelle anzeigen",
    hTime: "Zeit",
    notConfigured:
      "Keine Sensoren konfiguriert. Unter Einstellungen → Geräte & Dienste → Energy Assistant auswählen.",
    menu: "Menü",
    solar: "PV",
    solarDirect: "PV direkt",
    gridImport: "Netzbezug",
    storage: "Speicher",
    grid: "Netz",
    devices: "Geräte",
    otherDevices: "Sonstiges (nicht gemessen)",
    idleDevices: "{n} inaktiv",
    share: "{pct} % vom Haus",
    settings: "Einstellungen",
    save: "Speichern",
    discard: "Verwerfen",
    saved: "Gespeichert",
    saving: "Speichert …",
    saveFailed: "Speichern fehlgeschlagen: {error}",
    adminOnly: "Nur Administratoren können die Einstellungen ändern.",
    noSource: "Netzbezug, Netz kombiniert oder Hausverbrauch ist nötig.",
    addSensor: "Sensor hinzufügen …",
    unknownSensor: "Unbekannter Sensor: {id}",
    remove: "Entfernen",
    loading: "Lädt …",
    sectionGrid: "Netz und Haus",
    sectionSolar: "PV und Speicher",
    sectionDevices: "Geräte",
    f_grid_power: "Netz kombiniert (Bezug +, Einspeisung −)",
    f_invert_grid: "Vorzeichen Netz umkehren",
    f_grid_import: "Netzbezug einzeln",
    f_grid_export: "Einspeisung einzeln",
    f_house_power: "Hausverbrauch direkt (optional)",
    f_solar_power: "PV-Erzeugung",
    f_battery_power: "Speicher kombiniert (Entladen +, Laden −)",
    f_invert_battery: "Vorzeichen Speicher umkehren",
    f_battery_discharge: "Vom Speicher (Entladen)",
    f_battery_charge: "Zum Speicher (Laden)",
    f_battery_grid_charge: "Speicher aus dem Netz geladen",
    f_device_power: "Zusätzliche Geräte-Sensoren (optional)",
    f_device_standby: "Standby-Geräte",
    f_alert_exclude: "Keine Hinweise für diese Geräte",
    h_alert_exclude: "Diese Geräte lösen nie einen Hinweis über stundenlanges Laufen oder ungewöhnlich hohen Verbrauch aus (zum Beispiel die Wallbox).",
    alUnusual: "{name} verbraucht seit {hours} Stunden mehr als üblich: im Schnitt {now} (sonst höchstens {ref})",
    f_label_tariffs: "Tarif pro Label (für die Kostensensoren)",
    h_label_tariffs: "Welcher Tariffy-Stromvertrag die Kosten eines Labels bewertet, z. B. der Wärmepumpentarif für das Wärmepumpen-Label. Die Kostensensoren rechnen ab dann mit dem Preis dieses Vertrags; was vorher gezählt wurde, bleibt.",
    tariffDefault: "Standard ({name})",
    h_device_standby: "Standby-Geräte werden im Verbrauch-Tab als Dauerlast gezeigt. Keine Auswahl = automatisch erkannt.",
    f_device_patterns: "Namensmuster für Geräte-Sensoren",
    addPattern: "z. B. *_leistung",
    invalidPattern: "Erlaubt sind nur Buchstaben, Ziffern, _ . * und ?.",
    matchesCount: "{n} passend, {x} ausgeschlossen. Häkchen entfernen schließt einen Sensor aus.",
    matchesSummary: "{n} passende Sensoren, {x} ausgeschlossen",
    matchesShow: "Liste zeigen",
    matchesHide: "Liste ausblenden",
    filterMatches: "Treffer filtern …",
    filterAll: "Alle",
    filterGroupState: "Aktivität",
    filterGroupSel: "Auswahl",
    filterSelected: "Ausgewählt",
    filterUnselected: "Nicht ausgewählt",
    filterLabels: "Labels filtern …",
    noLabelMatches: "Kein Label passt zu den Filtern",
    sectionAreas: "Bereiche",
    f_area_ids: "Bereiche (ihre Leistungssensoren werden je Bereich zusammengefasst)",
    filterAreas: "Bereiche filtern …",
    noAreaMatches: "Kein Bereich passt zu den Filtern",
    noPowerAreas: "Noch kein Bereich hat Leistungssensoren. Ordne deine Leistungssensoren oder ihre Geräte einem Bereich zu.",
    noAreasDefined: "In Home Assistant gibt es noch keine Bereiche. Anlegen unter Einstellungen → Bereiche, Labels & Zonen.",
    amTitle: "Amortisation",
    aSavings: "Einsparung gesamt",
    aInvest: "Investition",
    aProgress: "Fortschritt",
    aRemaining: "Verbleibend",
    aPerDay: "Ersparnis pro Tag",
    aDays: "Restzeit",
    aDaysUnit: "Tage",
    aDate: "Amortisation am",
    pvDayTitle: "PV heute und morgen",
    pvToday: "Heute",
    pvTomorrow: "Morgen",
    dProduction: "Erzeugung",
    dFeedIn: "Einspeisung",
    dSelf: "Eigenverbrauch",
    dAutarky: "Autarkie",
    dForecast: "Prognose erreicht",
    dBenefit: "Nutzen",
    dExpected: "Erwartete Einspeisung",
    dWindow: "Bestes Fenster",
    dStorageTitle: "Speicher",
    dStorage: "Speicher nutzbar",
    dEmptyAt: "Speicher leer um",
    dFault: "Anlagenstörung",
    evWallbox: "Wallbox",
    evCharging: "Lädt",
    evConnected: "Verbunden",
    evIdle: "Nicht verbunden",
    evSoc: "Ladestand",
    evSolar: "Solaranteil",
    evToday: "Heute geladen",
    evCostToday: "Ladekosten heute",
    evAdvice: "Laden vor PV empfehlenswert",
    costsNow: "Kosten jetzt",
    tPrice: "Strompreis",
    tGridCost: "Netzbezug kostet",
    tFeedIn: "Einspeisung bringt",
    tPvSaves: "PV spart",
    pvPlants: "PV je Anlage",
    intTitle: "Erkannte Integrationen",
    intPv: "PV Assistant",
    intPvData: "PV Assistant: Tagesbilanz, Prognose und Anlagenstörung im Tab PV",
    intTariffy: "Tariffy: Strompreis, Kosten und Vertrag im Tab Kosten",
    intEv: "EV Assistant: Wallbox und heutiges Laden im Tab EV ({n})",
    intAmortix: "Amortix: Einsparung und Amortisation im Tab Amortisation",
    pvTitle: "PV Assistant erkannt",
    pvAsk: "PV Assistant ist installiert. Sollen die Sensoren übernommen werden?",
    pvSolar: "PV-Erzeugung: {n} Sensoren",
    pvStorage: "Speicher: {parts}",
    pvCombined: "kombiniert {n}",
    pvCharge: "Laden {n}",
    pvDischarge: "Entladen {n}",
    pvGrid: "Netz: {parts}",
    pvImport: "Bezug {n}",
    pvExport: "Einspeisung {n}",
    pvFeedInfo: "Der Einspeise-Sensor von PV Assistant meldet die Einspeisung als negative Werte. Er wird als kombinierter Netzsensor genutzt (Bezug +, Einspeisung −).",
    pvAbsInfo: "Lade- und Entlade-Sensoren mit negativen Werten zählen mit ihrem Betrag.",
    pvApply: "Sensoren übernehmen",
    pvOverwrite: "Dadurch werden die Sensoren in diesen Feldern ersetzt. Danach speichern, damit sie bleiben.",
    pvDone: "Die Sensoren von PV Assistant sind übernommen.",
    areaAutoHint: "Nichts ausgewählt: Es werden alle Bereiche mit Leistungssensoren gezeigt. Wähle Bereiche, um nur diese zu zeigen.",
    noPowerLabels: "Noch kein Label hat Leistungssensoren. Versieh deine Leistungssensoren unter Einstellungen → Bereiche, Labels & Zonen mit einem Label.",
    filterActive: "Aktiv",
    filterIdle: "Inaktiv",
    filterIncluded: "Enthalten",
    filterExcluded: "Ausgeschlossen",
    filterActiveTip: "Aktuell mindestens 5 W",
    filterIdleTip: "Unter 5 W oder kein Wert",
    excludeShown: "Gezeigte ausschließen",
    includeShown: "Gezeigte zulassen",
    showAll: "Alle {n} zeigen",
    showLess: "Weniger zeigen",
    areas: "Bereiche",
    noArea: "Ohne Bereich",
    labels: "Labels",
    sectionSources: "Quellen aus anderen Integrationen",
    h_source_list: "Diese Sensoren kommen von Tariffy, EV Assistant, PV Assistant und Amortix. Energy Assistant liest sie nur. Zuerst wird alles verwendet; nimm den Haken weg, um einen Sensor nicht mehr zu verwenden (zum Beispiel eine zweite Wallbox-Zeile in der Geräteliste).",
    srcNone: "Es wurden keine Sensoren von Tariffy, EV Assistant, PV Assistant oder Amortix gefunden.",
    srcInt_tariffy: "Tariffy",
    srcInt_ev_assistant: "EV Assistant",
    srcInt_pv_assistant: "PV Assistant",
    srcInt_amortix: "Amortix",
    srcUse_tariffy: "Preis pro kWh für Kosten und Ersparnis, Einspeiseerlös, Reiter Kosten",
    srcUse_ev_assistant: "Auto im Reiter Leistung und im Bild, Reiter Auto, Wallbox-Zeile in der Geräteliste",
    srcUse_pv_assistant: "PV-Tageswerte, Prognose und Hinweise im Reiter PV",
    srcUse_amortix: "Einsparung und Amortisation im Reiter Amortix",
    srcUsed: "in Verwendung",
    srcOff: "nicht verwendet",
    src_arbeitspreis: "Strompreis",
    src_einspeiseverguetung: "Einspeisevergütung",
    src_kosten_bisher: "Kosten bisher",
    src_guthaben_bisher: "Guthaben bisher",
    src_prognose_real: "Prognose",
    src_home_kwh: "Heimladen gesamt (seine Attribute tragen die Livedaten der Wallbox)",
    src_kwh_day: "Heute geladene Energie",
    src_cost_day: "Kosten heute",
    src_charge_before_pv_recommended: "Empfehlung: vor der Sonne laden",
    src_wallbox_power: "Leistungssensor der Wallbox (auch die Wallbox-Zeile in der Geräteliste)",
    src_production_today: "Erzeugung heute",
    src_feed_in_today: "Einspeisung heute",
    src_self_consumption_rate_today: "Eigenverbrauch heute",
    src_autarky_today: "Autarkie heute",
    src_benefit_today: "Nutzen heute",
    src_forecast_reached_today: "Prognose heute erreicht",
    src_expected_feed_in_tomorrow: "Erwartete Einspeisung morgen",
    src_best_window_tomorrow: "Bestes Fenster morgen",
    src_storage_usable: "Nutzbare Speicherenergie",
    src_storage_roundtrip_total: "Speicher-Wirkungsgrad (Roundtrip)",
    src_storage_empty_at: "Speicher leer um",
    src_string_fault: "Anlagenstörung",
    src_einsparung: "Einsparung gesamt",
    src_investition: "Investition",
    src_fortschritt: "Fortschritt der Amortisation",
    src_verbleibend: "Verbleibend",
    src_tagesschnitt: "Einsparung pro Tag",
    src_resttage: "Tage bis zur Amortisation",
    src_datum: "Amortisationsdatum",
    sectionLabels: "Labels",
    f_label_ids: "Labels (ihre Leistungssensoren werden je Label zusammengefasst)",
    noLabelsDefined: "In Home Assistant gibt es noch keine Labels. Anlegen unter Einstellungen → Bereiche, Labels & Zonen.",
    labelSensors1: "1 Leistungssensor",
    labelSensorsN: "{n} Leistungssensoren",
    deviceCount1: "1 Gerät",
    deviceCountN: "{n} Geräte",
    f_device_exclude: "Ausgeschlossene Sensoren (nie durch ein Muster)",
    f_device_exclude_patterns: "Ausschluss-Muster",
    addExcludePattern: "z. B. alpha_ess_*",
    excludedByPattern: "Durch ein Ausschluss-Muster ausgeschlossen",
    noMatches: "Noch kein Leistungssensor passt",
  },
};

const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Settings form: [key, kind]. "multi" = several sensors, "single" = one sensor.
// --- time zone of the Home Assistant instance (hass.config.time_zone), not the one of the browser -------------
const _tzFormats = new Map();
function _tzFormat(tz) {
  let f = _tzFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    _tzFormats.set(tz, f);
  }
  return f;
}
/** The wall clock of an instant in a time zone: year, month (1-12), day, hour, minute, second. */
function tzParts(ms, tz) {
  const out = {};
  for (const part of _tzFormat(tz).formatToParts(ms)) if (part.type !== "literal") out[part.type] = Number(part.value);
  return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, mi: out.minute, s: out.second };
}
function tzOffset(ms, tz) {
  const p = tzParts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}
/** The instant of a wall clock time (month 0-11, days and months may overflow) in a time zone. */
function zonedTime(y, m, d, h, tz) {
  const guess = Date.UTC(y, m, d, h);
  const first = guess - tzOffset(guess, tz);
  return guess - tzOffset(first, tz);
}
const BAL_CATS = [["solar", "energy_solar"], ["imp", "energy_grid_import"], ["exp", "energy_grid_export"], ["chg", "energy_battery_charge"], ["dis", "energy_battery_discharge"], ["house", "energy_house"]];
const NUMBER_KEYS = ["battery_capacity", "battery_min_soc", "ev_consumption"];
const ENERGY_KEYS = ["energy_solar", "energy_grid_import", "energy_grid_export", "energy_battery_charge", "energy_battery_discharge", "energy_house"];
/** What can be entered per year; the key is the total of the balance it replaces. */
const HISTORY_KINDS = [["house", "cons", "histHouse"], ["solar", "solar", "histSolar"], ["import", "imp", "histImport"], ["export", "exp", "histExport"]];
// The colors of the balance chart for the same values.
const HISTORY_COLORS = { house: "--ea-house", solar: "--ea-prod", import: "--ea-grid", export: "--ea-feed" };

/**
 * Manual yearly values {year: {kind: {kwh, cost?}}}: plausible years, known kinds and positive finite numbers only
 * (like the backend). The first version stored {year: {kwh, cost?}} for the house; that is the kind "house".
 */
function cleanHistory(value, maxYear = Infinity) {
  const out = {};
  if (!value || typeof value !== "object") return out;
  for (const key of Object.keys(value).sort()) {
    const year = Number(key), e = value[key];
    if (!Number.isInteger(year) || year < 1990 || year > maxYear || !e || typeof e !== "object") continue;
    const kinds = "kwh" in e ? { house: e } : e;
    const row = {};
    for (const [kind] of HISTORY_KINDS) {
      const v = kinds[kind];
      const kwh = v && typeof v === "object" ? Number(v.kwh) : NaN;
      if (!Number.isFinite(kwh) || kwh <= 0) continue;
      const item = { kwh };
      const cost = v.cost == null || v.cost === "" ? null : Number(v.cost);
      if (cost != null && Number.isFinite(cost) && cost > 0) item.cost = cost;
      row[kind] = item;
    }
    if (Object.keys(row).length) out[String(year)] = row;
  }
  return out;
}

// Flat illustrations of the results card (inline, so they do not depend on an icon font).
// Home batteries in front of the house (instead of the door): one for each storage, standing apart on the grass and
// filled up to its charge level, the percentage below it.
const RES_BAT_X = 258; // the batteries start right of the window
function resBatterySize(n) {
  const w = n === 1 ? 34 : n === 2 ? 30 : n === 3 ? 27 : 24, gap = n === 1 ? 0 : n === 2 ? 20 : n === 3 ? 18 : 14;
  return { w, gap, total: n * w + (n - 1) * gap };
}
/** How much wider than 400 the picture is, so the batteries stand left of the card that overlaps its right edge. */
function resExtra(socs) {
  const n = Math.min(4, socs.length);
  return n ? Math.max(0, RES_BAT_X + resBatterySize(n).total + 92 - 400) : 0;
}
function resBatteries(socs) {
  const list = socs.slice(0, 4), n = list.length;
  const { w, gap } = resBatterySize(n);
  const x0 = RES_BAT_X, h = 62, bottom = 256, top = bottom - h, segs = 6; // bottom = the foot of the wall: the unit stands against the house
  const font = n <= 2 ? 10 : n === 3 ? 9.5 : 9;
  let out = "";
  list.forEach((soc, i) => {
    const x = x0 + i * (w + gap), cx = x + w / 2;
    const known = soc != null;
    const color = !known ? "#6b7a99" : soc >= 60 ? "#34d399" : soc >= 25 ? "#f7b733" : "#f87171";
    const lit = known && soc > 0 ? Math.max(1, Math.round((soc / 100) * segs)) : 0;
    // a home storage unit: housing on two feet, a dark display slot with LED segments, a bolt on top, a status light
    const sx = x + 5, sw = w - 10, sy = top + 14, sh = h - 29, sgap = 2;
    out += `<ellipse cx="${cx.toFixed(1)}" cy="${bottom + 3}" rx="${(w / 2 + 6).toFixed(1)}" ry="3.2" fill="#0d1a12" opacity=".65"/>`
      + `<rect x="${(x + 4).toFixed(1)}" y="${bottom - 1}" width="5" height="4" rx="1" fill="#252d42"/><rect x="${(x + w - 9).toFixed(1)}" y="${bottom - 1}" width="5" height="4" rx="1" fill="#252d42"/>`
      + `<rect class="unit" data-soc="${known ? Math.round(soc) : ""}" x="${x.toFixed(1)}" y="${top}" width="${w}" height="${h}" rx="6" fill="#465273" stroke="#7a89ad" stroke-width="1.4"/>`
      + `<rect x="${(x + 1.5).toFixed(1)}" y="${top + 1.5}" width="${w - 3}" height="9" rx="4.5" fill="#566488"/>`
      + `<path d="M${(cx + 1.2).toFixed(1)} ${top + 2.4}l-3.6 4.2h2.6l-1 3.6 3.6-4.4h-2.6z" fill="#ffd36b"/>`
      + `<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw}" height="${sh.toFixed(1)}" rx="2.5" fill="#10151f"/>`;
    for (let k = 0; k < segs; k++) {
      const on = k >= segs - lit; // filled from the bottom
      const hh = (sh - 4 - sgap * (segs - 1)) / segs;
      const yy = sy + 2 + k * (hh + sgap);
      out += on
        ? `<rect class="glowb" x="${(sx + 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${sw - 4}" height="${hh.toFixed(1)}" rx="1" fill="${color}" style="color:${color}"/>`
        : `<rect x="${(sx + 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${sw - 4}" height="${hh.toFixed(1)}" rx="1" fill="#252e42"/>`;
    }
    out += `<circle cx="${cx.toFixed(1)}" cy="${bottom - 9}" r="2.2" fill="${color}" style="color:${color}" class="glowb"/>`
      + `<text x="${cx.toFixed(1)}" y="${bottom + 15}" text-anchor="middle" font-size="${font}" font-weight="700" fill="#e8edf5" stroke="#0d111b" stroke-opacity=".55" stroke-width="1.1" paint-order="stroke" style="font-family:inherit">${known ? `${Math.round(soc)}%` : "–"}</text>`;
  });
  return out;
}

// The two wires from the pole to the house run parallel, 7 units apart: import on the upper, feed-in on the lower one.
const RES_WIRE = { in: ["36 115.5", "50.5 137.5", "64.5 150.5"], out: ["30 121", "44.5 143", "58.5 156"] };
/** The power pole at the left of the house: the grid (import and feed-in), with the wire to the house. */
function resPole() {
  return `<path d="M18 270V104" stroke="#6a5640" stroke-width="5.5" stroke-linecap="round"/><path d="M3 118h35" stroke="#6a5640" stroke-width="4" stroke-linecap="round"/><path d="M7 133h22" stroke="#6a5640" stroke-width="3.2" stroke-linecap="round"/>`
    + `<rect x="22" y="146" width="9" height="15" rx="2.5" fill="#55607a" stroke="#7a89ad" stroke-width="1"/>`
    + `<circle cx="4.5" cy="115" r="2.5" fill="#aab6cf"/><circle cx="18" cy="101" r="2.5" fill="#aab6cf"/><circle cx="36" cy="115.5" r="2.4" fill="#aab6cf"/><circle cx="30" cy="121" r="2.4" fill="#aab6cf"/>`
    + `<path d="M${RES_WIRE.in[0]}Q${RES_WIRE.in[1]} ${RES_WIRE.in[2]}" fill="none" stroke="#37405a" stroke-width="1.4"/><path d="M${RES_WIRE.out[0]}Q${RES_WIRE.out[1]} ${RES_WIRE.out[2]}" fill="none" stroke="#37405a" stroke-width="1.4"/>`
    + `<path d="M4.5 115Q-6 124 -12 120" fill="none" stroke="#37405a" stroke-width="1.8"/>`;
}

const RES_FLOW = { pv: "#ff9800", in: "#60a5fa", out: "#a78bfa", charge: "#f06292", discharge: "#4db6ac", ev: "#34d399" };
/**
 * The energy flow of the picture as moving dashes, with the kWh of the shown period (see _resFlows): the sun into the
 * house, the grid between the pole and the house (import towards the house, feed-in towards the pole) and the
 * storages (charging from the house, discharging into the house). `flows` has the ones with energy and their texts.
 */
function resFlows(flows, socs) {
  if (!flows) return "";
  // The line width follows the share of the flow: the biggest flow in the picture is 100 %.
  const all = [flows.pv, flows.in, flows.out, flows.ev, flows.charge, flows.discharge, ...(flows.units || []).flatMap((u) => [u?.charge, u?.discharge])].filter(Boolean).map((f) => f.v);
  const max = Math.max(...all, 0.0001);
  const width = (f) => +(1.2 + 1.8 * (f.v / max)).toFixed(2);
  const label = (color, txt, tx, ty, anchor = "middle", size = 9) => `<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" stroke="#0d111b" stroke-opacity=".6" stroke-width="1.1" paint-order="stroke" style="font-family:inherit">${txt}</text>`;
  // A flow: a band of the width of its share and a triangular head at its end, turned along the line. `from` and `to`
  // are the ends, `via` the control point of a curve (or null for a straight line).
  const path = (from, via, to, key, f) => {
    const w = width(f), color = RES_FLOW[key];
    const dx = to[0] - (via ? via[0] : from[0]), dy = to[1] - (via ? via[1] : from[1]);
    const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const L = 4.5 + w * 1.4, H = 2.4 + w * 0.9; // head length and half width
    const bx = to[0] - ux * L, by = to[1] - uy * L; // base of the head, where the line ends
    const d = via ? `M${from[0]} ${from[1]}Q${via[0]} ${via[1]} ${bx.toFixed(1)} ${by.toFixed(1)}` : `M${from[0]} ${from[1]}L${bx.toFixed(1)} ${by.toFixed(1)}`;
    const head = `${to[0]},${to[1]} ${(bx - uy * H).toFixed(1)},${(by + ux * H).toFixed(1)} ${(bx + uy * H).toFixed(1)},${(by - ux * H).toFixed(1)}`;
    return `<path class="flow" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="4 3.2" stroke-linecap="butt" data-share="${Math.round((f.v / max) * 100)}"/><polygon class="flowhead" points="${head}" fill="${color}" stroke="${color}" stroke-width=".6" stroke-linejoin="round"/>`;
  };
  let out = "";
  if (flows.pv) out += path([125, 130], null, [125, 172], "pv", flows.pv) + label(RES_FLOW.pv, flows.pv.txt, 134, 156, "start");
  // two wires from the pole to the house: import runs towards the house, feed-in towards the pole
  if (flows.in) out += path(RES_WIRE.in[0].split(" ").map(Number), RES_WIRE.in[1].split(" ").map(Number), RES_WIRE.in[2].split(" ").map(Number), "in", flows.in) + label(RES_FLOW.in, flows.in.txt, 50, 110, "start", 8.5);
  if (flows.out) out += path(RES_WIRE.out[2].split(" ").map(Number), RES_WIRE.out[1].split(" ").map(Number), RES_WIRE.out[0].split(" ").map(Number), "out", flows.out) + label(RES_FLOW.out, flows.out.txt, 46, 176, "middle", 8.5);
  // the electric car in the garage: what the wallbox charged, from the house to the car
  if (flows.ev) out += path([198, 232], null, [164, 232], "ev", flows.ev) + label(RES_FLOW.ev, flows.ev.txt, 125, 201, "middle", 8.5);
  if (socs.length && (flows.charge || flows.discharge || flows.units)) {
    const n = Math.min(4, socs.length), { w, gap } = resBatterySize(n), fs = n <= 3 ? 8.5 : 7.5, off = w >= 27 ? 8 : 7;
    for (let i = 0; i < n; i++) {
      const cx = RES_BAT_X + i * (w + gap) + w / 2, u = flows.units?.[i];
      const c = flows.units ? u?.charge : flows.charge, d = flows.units ? u?.discharge : flows.discharge;
      if (c) out += path([cx - off, 164], null, [cx - off, 192], "charge", c);
      if (d) out += path([cx + off, 192], null, [cx + off, 164], "discharge", d);
      if (flows.units) { // every storage with its own values
        if (c) out += label(RES_FLOW.charge, c.txt, cx, 146, "middle", fs);
        if (d) out += label(RES_FLOW.discharge, d.txt, cx, c ? 157 : 146, "middle", fs);
      }
    }
    if (!flows.units) { // the totals of all storages above the group
      const mid = RES_BAT_X + (n * w + (n - 1) * gap) / 2;
      if (flows.charge) out += label(RES_FLOW.charge, flows.charge.txt, mid, 146, "middle", fs);
      if (flows.discharge) out += label(RES_FLOW.discharge, flows.discharge.txt, mid, flows.charge ? 157 : 146, "middle", fs);
    }
  }
  return out;
}

const RES_MOON = `<g class="moon"><defs><radialGradient id="resMoonGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#b9c8f0" stop-opacity=".45"/><stop offset="1" stop-color="#b9c8f0" stop-opacity="0"/></radialGradient><mask id="resMoonMask"><rect x="40" y="12" width="64" height="64" fill="#fff"/><circle cx="82" cy="37" r="14" fill="#000"/></mask></defs><circle cx="72" cy="44" r="40" fill="url(#resMoonGlow)"/><circle cx="72" cy="44" r="17" fill="#e6ecfb" mask="url(#resMoonMask)"/><g fill="#cfd8f5"><circle cx="112" cy="26" r="1.6"/><circle cx="40" cy="22" r="1.3"/><circle cx="104" cy="62" r="1.2"/><circle cx="50" cy="70" r="1.4"/><circle cx="124" cy="46" r="1.1"/></g></g>`;
const RES_ART = {
  car: `<svg viewBox="0 0 56 32" width="46" height="27" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22v-5l5-1.5 5-8h20l7 8 8 1.5v5"/><path d="M5 22h46"/><path d="M17 15.5l3-5.5h13l5 5.5z"/><circle cx="16" cy="23" r="3.8" fill="#14171e"/><circle cx="40" cy="23" r="3.8" fill="#14171e"/></svg>`,
  house: `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="#dfe6f2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 15 16 5l12 10"/><path d="M7 13v13h18V13"/><path d="M17 12l-4 6h5l-3 6" stroke="#f7b733"/></svg>`,
  pig: `<svg viewBox="0 0 80 62" width="84" height="65" aria-hidden="true"><path d="M10 10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f7b733"/><circle cx="38" cy="9" r="7" fill="#f7b733" stroke="#ffd36b" stroke-width="2"/><path d="M38 5v8" stroke="#b9801a" stroke-width="2" stroke-linecap="round"/><g transform="translate(4 0)"><ellipse cx="34" cy="36" rx="25" ry="17" fill="#1f6f4a" stroke="#34d399" stroke-width="2.5"/><path d="M20 22 24 13 31 20" fill="#1f6f4a" stroke="#34d399" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="57" cy="35" rx="7" ry="6" fill="#2a8a5e" stroke="#34d399" stroke-width="2.5"/><circle cx="54" cy="27" r="1.8" fill="#d7fbea"/><rect x="19" y="48" width="7" height="9" rx="3" fill="#1b5e3f" stroke="#34d399" stroke-width="2"/><rect x="40" y="48" width="7" height="9" rx="3" fill="#1b5e3f" stroke="#34d399" stroke-width="2"/><path d="M9 33c-5-1-6-6-3-8" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/></g></svg>`,
  hero: (socs = [], flows = null, night = false) => `<svg viewBox="-24 0 ${424 + resExtra(socs)} 290" width="100%" aria-hidden="true"><defs><radialGradient id="resSunGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd36b" stop-opacity=".75"/><stop offset=".45" stop-color="#f7b733" stop-opacity=".22"/><stop offset="1" stop-color="#f7b733" stop-opacity="0"/></radialGradient><linearGradient id="resBeam" gradientUnits="userSpaceOnUse" x1="78" y1="44" x2="200" y2="104"><stop offset="0" stop-color="#ffd36b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36b" stop-opacity=".05"/></linearGradient><linearGradient id="resCar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d95c8"/><stop offset="1" stop-color="#455781"/></linearGradient><linearGradient id="resSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34d399" stop-opacity=".0"/><stop offset="1" stop-color="#34d399" stop-opacity=".16"/></linearGradient></defs><ellipse cx="${188 + resExtra(socs) / 2}" cy="266" rx="${210 + resExtra(socs) / 2}" ry="22.5" fill="#1d4a30"/><ellipse cx="${200 + resExtra(socs) / 2}" cy="261" rx="${150 + resExtra(socs) / 2}" ry="12" fill="#2b6a42"/>${resPole()}<rect x="82" y="150" width="228" height="108" fill="#2b3142"/><rect x="82" y="150" width="228" height="8" fill="#232938"/><polygon points="52,156 150,64 318,64 318,156" fill="#131a2a"/><polygon points="52,156 150,64 160,64 66,156" fill="#222c44"/><g class="glowp" transform="translate(150 72) skewX(-38)"><rect x="0" y="0" width="112" height="62" fill="#2866b0"/><path d="M28 0v62M56 0v62M84 0v62M0 20.5h112M0 41h112" stroke="#8fbdf0" stroke-width="2"/></g>${night ? RES_MOON : `<g class="beams"><polygon points="82,50 128,86 160,70" fill="url(#resBeam)"/><polygon points="84,54 150,112 192,86" fill="url(#resBeam)"/><polygon points="86,58 176,124 226,100" fill="url(#resBeam)"/></g><g class="glows"><circle cx="72" cy="44" r="42" fill="url(#resSunGlow)"/><g stroke="#ffd36b" stroke-width="3.2" stroke-linecap="round"><path d="M72 14v8M72 66v8M42 44h8M94 44h8M51 23l5.6 5.6M87.4 59.4 93 65M93 23l-5.6 5.6M56.6 59.4 51 65"/></g><circle cx="72" cy="44" r="15" fill="#ffd36b" stroke="#f7b733" stroke-width="3"/></g>`}<rect x="82" y="182" width="86" height="76" fill="#1c2233"/><rect x="82" y="182" width="86" height="7" fill="#2d3548"/><ellipse cx="125" cy="255" rx="38" ry="4" fill="#080b12" opacity=".7"/><rect x="92.5" y="238" width="13" height="19" rx="5" fill="#2a3144" stroke="#4a5570" stroke-width="1.2"/><rect x="144.5" y="238" width="13" height="19" rx="5" fill="#2a3144" stroke="#4a5570" stroke-width="1.2"/><path d="M96 243v11M99 243v11M102 243v11M148 243v11M151 243v11M154 243v11" stroke="#3d4760" stroke-width="1"/><path d="M98 224C99 214 103 209 106 207H144C147 209 151 214 152 224Z" fill="#5a73a6"/><path d="M103 222C104 215 107 211.5 109.5 210H140.5C143 211.5 146 215 147 222Z" fill="#1d2539"/><path d="M109 220 113 211.5h6l-4.5 8.5z" fill="#fff" opacity=".1"/><rect x="92" y="220" width="66" height="26" rx="8" fill="url(#resCar)"/><rect x="93" y="221" width="64" height="4.5" rx="2.2" fill="#a4b7e0" opacity=".3"/><rect class="glowr" x="96" y="227" width="58" height="3.6" rx="1.8" fill="#ff5a5a"/><rect x="115" y="234" width="20" height="7" rx="1.5" fill="#e8edf5"/><path d="M118 237.5h14" stroke="#9aa6bb" stroke-width="1.4"/><rect x="96" y="243" width="58" height="6" rx="3" fill="#2a3248"/><rect class="glowa" x="198" y="178" width="46" height="44" fill="#ffd87a" stroke="#1b2130" stroke-width="4"/><path d="M221 178v44M198 200h46" stroke="#1b2130" stroke-width="3"/>${socs.length ? resBatteries(socs) : `<rect x="258" y="184" width="30" height="74" fill="#46506a"/><rect x="262" y="190" width="22" height="26" fill="#ffd87a" opacity=".85"/>`}<circle cx="46" cy="252" r="20" fill="#2f7a45"/><circle cx="68" cy="258" r="14" fill="#3d9657"/>${socs.length ? "" : `<circle cx="336" cy="256" r="16" fill="#2f7a45"/><circle cx="352" cy="260" r="11" fill="#3d9657"/>`}${resFlows(flows, socs)}</svg>`,
};

const SETTINGS_SECTIONS = [
  { title: "sectionGrid", fields: [["grid_power", "multi"], ["invert_grid", "bool"], ["grid_import", "single"], ["grid_export", "single"], ["house_power", "single"]] },
  { title: "sectionSolar", fields: [["solar_power", "multi"], ["battery_power", "multi"], ["invert_battery", "bool"], ["battery_discharge", "multi"], ["battery_charge", "multi"], ["battery_grid_charge", "single"], ["battery_soc", "soc"], ["battery_soc_more", "socs"], ["battery_capacity", "number"], ["battery_min_soc", "number"]] },
  { title: "sectionEnergy", fields: [["energy_offer", "energyoffer"], ["energy_solar", "emulti"], ["energy_grid_import", "emulti"], ["energy_grid_export", "emulti"], ["energy_battery_charge", "emulti"], ["energy_battery_discharge", "emulti"], ["energy_house", "emulti"], ["ev_consumption", "number"], ["cost_grid_only", "bool"], ["h_cost_mix", "note"], ["history_years", "history"]] },
  { title: "sectionDevices", fields: [["device_patterns", "text"], ["device_exclude_patterns", "text"], ["device_power", "multi"], ["device_standby", "multi"], ["h_device_standby", "note"], ["alert_exclude", "multi"], ["h_alert_exclude", "note"], ["device_matches", "matches"], ["device_ids", "multi"], ["device_ids_note", "devnote"], ["device_setup", "devsetup"], ["device_exclude", "multi"]] },
  { title: "sectionAreas", fields: [["area_ids", "areas"], ["h_area_sensors", "note"], ["area_tariffs", "areatariffs"]] },
  { title: "sectionLabels", fields: [["label_ids", "labels"], ["h_label_sensors", "note"], ["label_tariffs", "labeltariffs"]] },
  { title: "sectionSources", fields: [["h_source_list", "note"], ["source_list", "sources"]] },
];
const LIST_KEYS = ["grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge", "battery_soc", "battery_soc_more", "device_power", "device_standby", "standby_normal", "alert_exclude", "device_ids", "device_patterns", "device_exclude", "device_exclude_patterns", "source_exclude", "label_ids", "area_ids", ...ENERGY_KEYS];
// Sensors that are part of the energy balance and therefore never listed as devices.
// The two pick lists of the settings (labels and areas) share their code. Each has its own
// attribute names, element id and filter state.
const PICKERS = {
  label: { attr: "label", filter: "lfilter", seg: "lseg", list: "llist", state: ["_lFilter", "_lState", "_lSel"], key: "label_ids", icon: "mdi:label", noMatches: "noLabelMatches", nonePower: "noPowerLabels", empty: "noLabelsDefined", placeholder: "filterLabels" },
  area: { attr: "area", filter: "afilter", seg: "aseg", list: "alist", state: ["_aFilter", "_aState", "_aSel"], key: "area_ids", icon: "mdi:texture-box", noMatches: "noAreaMatches", nonePower: "noPowerAreas", empty: "noAreasDefined", placeholder: "filterAreas" },
};

// Power below this counts as idle and is only counted, not listed.
const IDLE_W = 5;
const LONG_RUN_W = 200; // a device that draws this much counts as running
const LONG_RUN_MS = 4 * 3600 * 1000; // running this long is worth a notice
const ALWAYS_RUN_MS = 20 * 3600 * 1000; // but not a device that never stopped (heat pump, pool pump)
// Unusual consumption: the last UNUSUAL_HOURS full hours of a device were all above the highest hourly mean it reached
// on the days before by this factor and at least this many watts (a fridge that runs far longer than usual).
const UNUSUAL_HOURS = 3;
const UNUSUAL_FACTOR = 1.3;
const UNUSUAL_MIN_W = 20;
const UNUSUAL_MIN_HOURS_REF = 48; // hourly values needed from the days before to know what is usual
const FLOW_W = 20; // charging or discharging from this power on
const levelColor = (v) => (v >= 60 ? "var(--eb-green)" : v >= 25 ? "var(--eb-gold)" : "var(--eb-red)"); // the color of a charge level
const PIC_FLOW_W = 1; // the picture shows a flow from this power on (a few watts of grid import still count)
// Rows the lists show before they fold. They follow the shortest list, but within these bounds.
const MAX_ROWS = 8;
const MIN_ROWS = 5;
// Colors of the categories and devices in the Devices tab (a label's own color wins for its category).
const DEV_COLORS = ["#4c8bf5", "#34d399", "#ff9f43", "#7dc4ff", "#ef4444", "#22d3ee", "#a78bfa", "#fbbf24", "#f472b6", "#84cc16"];
const DEV_ROWS = 5; // devices a category card shows before *Show all*
// A name without the word that only says it is the power sensor ("Backofen Leistung" -> "Backofen"), like the backend.
const stripPower = (name) => String(name).replace(/[\s_-]*(wirkleistung|leistung|power)\s*$/i, "").trim() || String(name);
const SYSTEM_KEYS = ["house_power", "grid_power", "grid_import", "grid_export", "solar_power", "battery_power", "battery_discharge", "battery_charge", "battery_grid_charge"];
const PATTERN_RE = /^[a-z0-9_.*?]+$/;

/**
 * Name patterns: "*" matches any text, "?" one character.
 * Without a dot the pattern is compared with the part after "sensor.", e.g. "*_power".
 */
const patternRegExp = (pattern) => {
  const re = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return { full: pattern.includes("."), re: new RegExp(`^${re}$`, "i") };
};

/** Compile patterns once and return a function that tests entity ids. */
const compilePatterns = (patterns) => {
  const list = patterns.map(patternRegExp);
  return (entityId) => {
    const short = entityId.slice(entityId.indexOf(".") + 1);
    return list.some((p) => p.re.test(p.full ? entityId : short));
  };
};
const BOOL_KEYS = ["invert_grid", "invert_battery", "cost_grid_only"];

// Power is always shown in watts (also above 1000 W), whatever unit the sensors report.
const fmtPower = (w) => {
  if (w == null || Number.isNaN(w)) return ["–", ""];
  return [Math.round(w).toLocaleString(), "W"];
};

class EnergyAssistantPanel extends HTMLElement {
  static cleanHistory(value, maxYear) { return cleanHistory(value, maxYear); }

  constructor() {
    super();
    this._tab = "house";
    this._history = null;
    this._lastHistory = 0;
    this.attachShadow({ mode: "open" });
  }

  set panel(p) {
    // Initial copy from the panel registration, only a fallback until the live settings arrive.
    this._fallback = (p && p.config) || {};
  }
  set narrow(n) { this._narrow = n; this._render(); }
  set hass(h) {
    this._hass = h;
    this._loadConfig();
    this._render();
    this._maybeLoadHistory();
  }

  get _cfg() { return this._config || this._fallback || {}; }

  get _isAdmin() { return this._hass?.user?.is_admin !== false; }

  /** Load the live settings over the WebSocket API (once). */
  async _loadConfig() {
    if (this._ready || this._loadingCfg || !this._hass) return;
    this._loadingCfg = true;
    try {
      this._config = await this._hass.callWS({ type: "energy_assistant/get_config" });
    } catch (e) {
      console.warn("Energy Assistant: could not load settings, using the registration copy", e);
      this._config = this._fallback || {};
    } finally {
      this._draft = this._normalize(this._config);
      this._ready = true;
      this._loadingCfg = false;
      this._settingsDirty = true;
      this._render();
      this._maybeLoadHistory();
      this._loadLabels();
      this._loadGroupEnergy();
      this._loadPv();
      this._loadIntegrations();
      this._loadEnergyOffer();
    }
  }

  /** The counters of the Energy dashboard as an offer for the energy counters (the backend only reads them). */
  async _loadEnergyOffer() {
    if (this._energyLoading || !this._hass) return;
    this._energyLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/energy_suggestion" });
      this._energyOffer = res?.targets && Object.keys(res.targets).length ? { targets: res.targets } : null;
    } catch (e) {
      console.info("Energy Assistant: could not ask for the Energy dashboard", e);
      this._energyOffer = null;
    } finally {
      this._energyLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /**
   * Entities of installed sibling integrations (Tariffy, ...). The backend only reads them; the values
   * come live from the states. Without any of them the answer is empty and nothing is shown.
   */
  async _loadIntegrations() {
    if (this._intLoading || !this._hass) return;
    this._intLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/integrations" });
      this._int = res && typeof res === "object" ? res : {};
    } catch (e) {
      console.info("Energy Assistant: could not ask for sibling integrations", e);
      this._int = {};
    } finally {
      this._intLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** Electricity price in currency/kWh (the live price of a dynamic tariff if Tariffy has one). */
  _price() {
    const t = this._int?.tariffy;
    const state = t?.price && this._hass?.states?.[t.price];
    if (!state) return null;
    const live = parseFloat(state.attributes?.arbeitspreis_aktuell);
    const value = Number.isNaN(live) ? parseFloat(state.state) : live;
    if (Number.isNaN(value)) return null;
    const unit = String(state.attributes?.unit_of_measurement || "EUR/kWh");
    return { value, currency: unit.split("/")[0] || "EUR" };
  }

  /**
   * The price of a kWh of a device in the shown period: the grid price for the share the grid delivered of the
   * consumption of the period (grid import / consumption of the balance), the feed-in tariff that is lost for the rest.
   * The grid price when the balance is not there, with the setting that prices everything at the grid price, or
   * when no price is known.
   */
  _mixPrice(price, range, off) {
    if (Number.isNaN(price) || this._cfg.cost_grid_only) return price;
    const b = this._bal, t = b?.totals;
    if (!b || b.failed || b.range !== range || b.off !== off || !(t?.cons > 0) || t.imp == null) return price;
    const share = Math.max(0, Math.min(1, t.imp / t.cons));
    return price * share + (this._feedInTariff() ?? 0) * (1 - share);
  }

  _feedInTariff() {
    const id = this._int?.tariffy?.feed_in;
    const v = id && this._hass?.states?.[id] ? parseFloat(this._hass.states[id].state) : NaN;
    return Number.isNaN(v) ? null : v;
  }

  /**
   * Savings and payback of Amortix (read only): total savings, investment, progress, what remains, the
   * daily savings and the expected payback date, per entry (the overview entry replaces the others).
   * Tiles without a value are left out; empty without Amortix.
   */
  _renderAmortix() {
    const entries = this._int?.amortix?.entries;
    if (!Array.isArray(entries) || !entries.length) return "";
    const lang = this._hass?.language || "en";
    const tile = (label, value, unit = "", extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div>${extra}</div>`;
    const blocks = entries.map((entry) => {
      const ids = entry.entities || {};
      const tiles = [];
      const money = (label, key) => {
        const v = this._num(ids[key]);
        if (v == null) return;
        const [n, sym] = this._money(v, this._hass?.states?.[ids[key]]?.attributes?.unit_of_measurement || "EUR");
        tiles.push(tile(label, n, sym));
      };
      money(this._t("aSavings"), "einsparung");
      money(this._t("aInvest"), "investition");
      const progress = this._num(ids.fortschritt);
      if (progress != null) {
        const pct = Math.max(0, Math.min(100, progress));
        tiles.push(tile(this._t("aProgress"), pct.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "%", `<div class="amo-bar"><div style="width:${pct}%"></div></div>`));
      }
      money(this._t("aRemaining"), "verbleibend");
      money(this._t("aPerDay"), "tagesschnitt");
      const days = this._num(ids.resttage);
      if (days != null) tiles.push(tile(this._t("aDays"), Math.round(days).toLocaleString(lang), this._t("aDaysUnit")));
      const dateState = ids.datum && this._hass?.states?.[ids.datum]?.state;
      const date = dateState && !["unknown", "unavailable"].includes(dateState) ? new Date(dateState) : null;
      if (date && !Number.isNaN(date.getTime())) tiles.push(tile(this._t("aDate"), esc(date.toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric", timeZone: this._tz() }))));
      if (!tiles.length) return "";
      return `<div class="eb-label costs">${esc(entry.title || "Amortix")}</div><div class="tiles">${tiles.join("")}</div>`;
    }).join("");
    return blocks ? `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("amTitle"))}</span></div>${blocks}</div>` : "";
  }

  /**
   * The tabs that exist: Power always, the others only when the matching integration was found
   * (PV Assistant, EV Assistant, Tariffy, Amortix).
   */
  _tabs() {
    const found = this._int || {};
    const tabs = ["house"];
    // Balance (energy counters) and consumption (devices) are one tab with one period picker.
    if (this._usageEnabled() || this._balEnabled()) tabs.push("usage");
    // The Devices tab groups the devices by the selected labels.
    if ((this._cfg.label_ids || []).length) tabs.push("devices");
    if (found.pv_assistant || (this._pv?.plants || []).length >= 2) tabs.push("pv");
    if (found.ev_assistant?.vehicles?.length) tabs.push("ev");
    if (found.tariffy) tabs.push("costs");
    if (found.amortix?.entries?.length) tabs.push("amortix");
    return tabs;
  }

  /** On a narrow screen the tab bar scrolls sideways: bring the active tab to the middle when the tab changed. */
  _centerActiveTab(bar) {
    if (this._centeredTab === this._tab) return;
    const tab = bar.querySelector?.(".tab.active");
    if (!tab) return;
    this._centeredTab = this._tab;
    if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft = Math.max(0, tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2);
  }

  _tabLabel(tab) {
    return this._t({ house: "tabPower", usage: "tabUsage", devices: "tabDevices", pv: "tabPv", ev: "tabEv", costs: "tabCosts", amortix: "tabAmortix" }[tab] || tab);
  }

  /** Markup of the page of the current tab (not the settings). */
  _renderPage() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const stack = (...cards) => `<div class="stack">${cards.filter(Boolean).join("") || `<div class="eb-card"><div class="empty">–</div></div>`}</div>`;
    switch (this._tab) {
      case "usage": return this._renderConsumption();
      case "devices": return this._renderDevicesTab();
      case "pv": return stack(this._renderPvDay(), this._renderPvPlants());
      case "ev": return stack(this._renderEv());
      case "costs": return stack(this._renderCosts(this._current()), this._renderPeriodCosts(), this._renderGroupCosts("device"), this._renderGroupCosts("area"), this._renderGroupCosts("label"), this._renderContract());
      case "amortix": return stack(this._renderAmortix());
      default: return this._renderHouse();
    }
  }

  /** The mean of the values per bucket, so that a long series fits a small line (gaps stay empty). */
  _downsample(values, n = 48) {
    if (!values || !values.length) return [];
    const size = Math.max(1, Math.ceil(values.length / n));
    const out = [];
    for (let i = 0; i < values.length; i += size) {
      const part = values.slice(i, i + size).filter((v) => v != null && !Number.isNaN(v));
      out.push(part.length ? part.reduce((a, v) => a + Math.max(0, v), 0) / part.length : null);
    }
    return out;
  }

  /** A small line of a power series (zero at the bottom) as inline SVG; nothing without a visible curve. */
  _sparkline(values, { w = 96, h = 22, big = false } = {}) {
    const v = (values || []).map((x) => (x == null || Number.isNaN(x) ? null : Math.max(0, x)));
    const known = v.filter((x) => x != null);
    const max = Math.max(0, ...known);
    if (known.length < 4 || !(max > 0)) return "";
    const n = v.length;
    const x = (i) => (n === 1 ? 0 : (i / (n - 1)) * w).toFixed(1);
    const y = (val) => (h - 1 - (val / max) * (h - 3)).toFixed(1);
    let line = "", area = "", seg = [];
    const flush = () => {
      if (seg.length > 1) {
        line += seg.map(([i, val], k) => `${k ? "L" : "M"}${x(i)},${y(val)}`).join("");
        area += `${seg.map(([i, val], k) => `${k ? "L" : "M"}${x(i)},${y(val)}`).join("")}L${x(seg[seg.length - 1][0])},${h}L${x(seg[0][0])},${h}Z`;
      }
      seg = [];
    };
    v.forEach((val, i) => { if (val == null) flush(); else seg.push([i, val]); });
    flush();
    if (!line) return "";
    return `<svg class="spk${big ? " big" : ""}" viewBox="0 0 ${w} ${h}" ${big ? 'preserveAspectRatio="none"' : `width="${w}" height="${h}"`} aria-hidden="true"><path class="spkarea" d="${area}"/><path class="spkline" d="${line}"/></svg>`;
  }

  /** The consumption tab exists when devices are set up (single sensors or name patterns). */
  _usageEnabled() {
    return (this._cfg.device_power || []).length > 0 || (this._cfg.device_standby || []).length > 0 || (this._cfg.device_patterns || []).length > 0;
  }

  /** Watts per bucket of a history answer (null before the first value), in the unit of the sensor. */
  _sampleW(rows, id, t0, n, step) {
    if (!rows) return null;
    const f = this._unitFactor(id);
    const pts = rows
      .map((r) => ({ t: (r.lu ?? r.lc ?? 0) * 1000, v: parseFloat(r.s) }))
      .filter((p) => !Number.isNaN(p.v));
    let i = 0, last = null;
    const out = [];
    for (let k = 0; k <= n; k++) {
      const t = t0 + k * step;
      while (i < pts.length && pts[i].t <= t) last = pts[i++].v;
      out.push(last == null ? null : last * f);
    }
    return out;
  }

  /**
   * The lowest average over half an hour (6 buckets without a gap): the power that never goes away. Null when
   * there are less than 12 values or no complete half hour.
   */
  _baseline(values) {
    const win = 6;
    if (!values || values.filter((v) => v != null).length < win * 2) return null;
    let best = null;
    for (let k = 0; k + win <= values.length; k++) {
      const part = values.slice(k, k + win);
      if (part.some((v) => v == null)) continue;
      const mean = part.reduce((a, v) => a + Math.max(0, v), 0) / win;
      if (best == null || mean < best) best = mean;
    }
    return best;
  }

  /**
   * Per device: the energy since midnight in kWh (the power of the 5-minute buckets summed up) and the base
   * load of the last 24 hours. The devices that have no history are left out.
   */
  _usageCompute(res, ids, t0, t1) {
    const step = BUCKET_MIN * 60 * 1000;
    const n = Math.floor((t1 - t0) / step);
    const tz = this._tz();
    const day = tzParts(t1, tz);
    const midnight = zonedTime(day.y, day.m - 1, day.d, 0, tz);
    const from = Math.max(0, Math.ceil((midnight - t0) / step));
    const devices = [];
    for (const id of ids) {
      const arr = this._sampleW(res?.[id], id, t0, n, step);
      if (!arr) continue;
      let kwh = 0;
      for (let k = from; k < n; k++) kwh += (Math.max(0, arr[k] ?? 0) * step) / 3600000 / 1000;
      // How long the device has been running without a longer break (up to 15 minutes below the limit count as running).
      let end = -1, run = 0;
      for (let k = n; k >= Math.max(0, n - 3); k--) if (arr[k] != null && arr[k] >= LONG_RUN_W) { end = k; break; }
      if (end >= 0) {
        let startK = end, low = 0;
        for (let k = end - 1; k >= 0; k--) {
          if (arr[k] != null && arr[k] >= LONG_RUN_W) { startK = k; low = 0; } else if (++low > 3) break;
        }
        run = (end - startK + 1) * step;
      }
      // The mean of each of the last full hours (null where most of the hour has no values), oldest first.
      const perHour = Math.round(3600000 / step);
      const recent = Array.from({ length: UNUSUAL_HOURS }, (_, j) => {
        const hi = n - perHour * (UNUSUAL_HOURS - 1 - j), lo = hi - perHour + 1;
        const vals = [];
        for (let k = Math.max(0, lo); k <= hi; k++) if (arr[k] != null && !Number.isNaN(arr[k])) vals.push(arr[k]);
        return lo >= 0 && vals.length >= perHour / 2 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });
      const known = arr.filter((v) => v != null && !Number.isNaN(v));
      const hoursToday = Math.max(0.0001, (t1 - midnight) / 3600000);
      devices.push({
        id, name: this._deviceName(id), kwh, baseW: this._baseline(arr), run, recent, nowW: arr[n],
        spark: this._downsample(arr, 48), peak: known.length ? Math.max(0, ...known) : null, avgW: (kwh / hoursToday) * 1000,
      });
    }
    return { devices, at: Date.now() };
  }

  _maybeLoadUsage() {
    if (!this._ready || this._usageLoading) return;
    if (!this._usage || Date.now() - this._usage.at > 5 * 60 * 1000) this._loadUsage();
  }

  async _loadUsage() {
    if (!this._hass || this._usageLoading) return;
    this._usageLoading = true;
    try {
      const ids = this._deviceIds();
      const end = Date.now(), start = end - HISTORY_HOURS * 3600 * 1000;
      const res = ids.length
        ? await this._hass.callWS({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          include_start_time_state: true,
          significant_changes_only: false,
          minimal_response: true,
          no_attributes: true,
        })
        : {};
      this._usage = this._usageCompute(res, ids, start, end);
    } catch (e) {
      console.info("Energy Assistant: could not load the history of the devices", e);
      this._usage = { devices: [], failed: true, at: Date.now() };
    } finally {
      this._usageLoading = false;
      this._render();
    }
  }

  /** The statistics (hourly or daily means of the power) of some sensors in a period; null when the request fails. */
  async _usStats(ids, from, to, period) {
    ids = [...new Set(ids)];
    if (!ids.length || !(to > from)) return {};
    try {
      return await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(from).toISOString(),
        end_time: new Date(to).toISOString(),
        statistic_ids: ids,
        period,
        types: ["mean"],
        units: { power: "W" },
      });
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics of the devices", e);
      return null;
    }
  }

  /** Sensors for the house power in the statistics: the house sensor, otherwise the ones its balance is made of. */
  _houseStatIds() {
    const c = this._cfg;
    if (c.house_power) return [c.house_power];
    return [...(c.solar_power || []), ...(c.grid_import || []), ...(c.grid_export || []), ...(c.battery_discharge || []),
      ...(c.battery_charge || []), ...(c.battery_grid_charge || []), ...(c.grid_power || []), ...(c.battery_power || [])];
  }

  /** The house power per hour from statistics: the house sensor or the balance of the others (like the live value). */
  _houseHourly(res) {
    const c = this._cfg;
    const mean = (row) => (row.mean == null || Number.isNaN(row.mean) ? null : row.mean);
    const startOf = (row) => (typeof row.start === "number" ? row.start : Date.parse(row.start));
    if (c.house_power) return (res?.[c.house_power] || []).map(mean).filter((v) => v != null).map((v) => Math.max(0, v));
    const cats = [["solar", c.solar_power, "pos"], ["gridIn", c.grid_import, "pos"], ["gridOut", c.grid_export, "pos"], ["discharge", c.battery_discharge, "abs"],
      ["charge", c.battery_charge, "abs"], ["gridCharge", c.battery_grid_charge, ""], ["grid", c.grid_power, ""], ["battery", c.battery_power, ""]];
    const byStart = new Map();
    for (const [cat, ids, mode] of cats) {
      for (const id of ids || []) {
        for (const row of res?.[id] || []) {
          const v = mean(row);
          if (v == null) continue;
          const t = startOf(row);
          const e = byStart.get(t) || {};
          e[cat] = (e[cat] ?? 0) + (mode === "abs" ? Math.abs(v) : mode === "pos" ? Math.max(0, v) : v);
          byStart.set(t, e);
        }
      }
    }
    const out = [];
    for (const e of byStart.values()) {
      const parts = this._split({ ...e, grid: e.grid == null ? null : c.invert_grid ? -e.grid : e.grid, battery: e.battery == null ? null : c.invert_battery ? -e.battery : e.battery });
      const house = this._calcHouse(parts);
      if (house != null) out.push(house);
    }
    return out;
  }

  /** The lowest of the means, with at least 12 values (null otherwise). */
  _lowestMean(values) {
    const v = values.filter((x) => x != null && !Number.isNaN(x)).map((x) => Math.max(0, x));
    return v.length >= 12 ? Math.min(...v) : null;
  }

  /**
   * Consumption of a period from the long-term statistics: the energy of every device (hourly or daily means
   * times their duration) and the base load as the lowest hourly mean, of the house and of every device.
   */
  _usageFromStats(energyRes, baseRes, ids, hours = null) {
    const hoursOf = (row, period) => (row.end != null && row.start != null ? (Number(row.end) - Number(row.start)) / 3600000 : period === "day" ? 24 : 1);
    const devices = [];
    for (const id of ids) {
      const rows = energyRes?.[id];
      if (!rows || !rows.length) continue;
      let kwh = 0;
      for (const row of rows) {
        if (row.mean == null || Number.isNaN(row.mean)) continue;
        kwh += (Math.max(0, row.mean) * hoursOf(row, energyRes.__period)) / 1000;
      }
      const hourly = (baseRes?.[id] || []).map((r) => r.mean);
      const means = (hourly.length ? hourly : rows.map((r) => r.mean)).map((v) => (v == null || Number.isNaN(v) ? null : v));
      const known = means.filter((v) => v != null);
      devices.push({
        id, name: this._deviceName(id), kwh, baseW: this._lowestMean(hourly),
        spark: this._downsample(means, 60), peak: known.length ? Math.max(0, ...known) : null, avgW: hours > 0 ? (kwh / hours) * 1000 : null,
      });
    }
    return { devices, houseBase: this._lowestMean(this._houseHourly(baseRes)) };
  }

  _maybeLoadUsageView() {
    if (!this._ready || this._usageViewLoading) return;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    if (range === "day" && off === 0) return; // today comes from the history
    const v = this._usageView;
    if (!v || v.range !== range || v.off !== off || Date.now() - v.at > 5 * 60 * 1000) this._loadUsageView();
  }

  async _loadUsageView() {
    if (!this._hass || this._usageViewLoading) return;
    this._usageViewLoading = true;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    try {
      const win = this._balWindow(range, off);
      const to = Math.min(win.end, Date.now());
      const ids = this._deviceIds();
      const houseIds = this._houseStatIds();
      const hourly = range === "day" || range === "week";
      let energy, base;
      if (hourly) {
        base = await this._usStats([...ids, ...houseIds], win.start, to, "hour");
        energy = base;
      } else {
        const from = Math.max(win.start, to - 31 * 24 * 3600 * 1000);
        [energy, base] = await Promise.all([this._usStats(ids, win.start, to, "day"), this._usStats([...ids, ...houseIds], from, to, "hour")]);
      }
      if (energy == null || base == null) {
        this._usageView = { range, off, devices: [], houseBase: null, failed: true, at: Date.now() };
      } else {
        const calc = this._usageFromStats({ ...energy, __period: hourly ? "hour" : "day" }, base, ids, (to - win.start) / 3600000);
        this._usageView = { range, off, ...calc, at: Date.now() };
      }
    } finally {
      this._usageViewLoading = false;
      this._render();
    }
  }

  /**
   * The consumption tab: the base load of the house (what never goes away) with its yearly cost, the
   * biggest consumers of today in kWh and euro, and the devices that are always on (standby).
   */
  /**
   * What the home charging of a wallbox cost in a period, from EV Assistant (the real price of every charging session,
   * the solar share is free), not the kWh of its sensor at the grid price. `home_cost` is cumulative, so the cost is the
   * difference between its value at the end and at the start of the period (long-term statistics, for the running
   * period the live value). Null without such a value.
   */
  async _evCostPeriod(entityId, win, range) {
    const now = Date.now();
    const live = win.end > now;
    const lead = 3 * 86400000; // the last value before the period is the start
    const res = await this._hass.callWS({
      type: "recorder/statistics_during_period",
      start_time: new Date(win.start - lead).toISOString(),
      end_time: new Date(Math.min(win.end, now)).toISOString(),
      statistic_ids: [entityId],
      period: range === "day" ? "hour" : "day",
      types: ["max", "min"],
    });
    const rows = (res?.[entityId] || []).map((r) => ({ t: typeof r.start === "number" ? r.start : Date.parse(r.start), max: r.max, min: r.min })).filter((r) => Number.isFinite(r.t));
    const before = rows.filter((r) => r.t < win.start), inside = rows.filter((r) => r.t >= win.start);
    const base = before.length ? before[before.length - 1].max : inside.length ? inside[0].min : null;
    const state = parseFloat(this._hass?.states?.[entityId]?.state);
    const end = live && Number.isFinite(state) ? state : inside.length ? inside[inside.length - 1].max : base;
    if (!Number.isFinite(base) || !Number.isFinite(end)) return null;
    return Math.max(0, end - base);
  }

  /** The EV Assistant vehicle whose wallbox power sensor is this device (with a cost sensor), or null. */
  _evVehicleOf(deviceId) {
    return (this._int?.ev_assistant?.vehicles || []).find((v) => v.wallbox_power && v.wallbox_power === deviceId && v.home_cost) || null;
  }

  /** The cost of a wallbox device from EV Assistant for a period, or null while it is not loaded or without a source. */
  _evCostOf(deviceId, range, off) {
    const v = this._evVehicleOf(deviceId);
    return v ? this._evCosts?.get(`${v.home_cost}|${range}|${off}`)?.v ?? null : null;
  }

  /** Loads what the periods in view need (the shown period, in the Costs tab the four running ones), at most every 5 minutes. */
  async _maybeLoadEvCost() {
    if (!this._ready || this._evCostLoading || !this._hass) return;
    const sources = [...new Set((this._int?.ev_assistant?.vehicles || []).filter((v) => v.wallbox_power && v.home_cost).map((v) => v.home_cost))];
    if (!sources.length) return;
    const wanted = this._tab === "costs" ? ["day", "week", "month", "year"].map((r) => [r, 0]) : [[this._usRange ?? "day", this._usOff ?? 0]];
    this._evCosts = this._evCosts || new Map();
    const todo = [];
    for (const id of sources) for (const [r, o] of wanted) {
      const hit = this._evCosts.get(`${id}|${r}|${o}`);
      if (!hit || Date.now() - hit.at > 5 * 60 * 1000) todo.push([id, r, o]);
    }
    if (!todo.length) return;
    this._evCostLoading = true;
    try {
      for (const [id, r, o] of todo) {
        let v = null;
        try { v = await this._evCostPeriod(id, this._balWindow(r, o), r); } catch (e) { console.info("Energy Assistant: could not load the cost of the home charging", e); }
        this._evCosts.set(`${id}|${r}|${o}`, { v, at: Date.now() });
      }
    } finally {
      this._evCostLoading = false;
      this._render();
    }
  }

  _renderUsage({ bare = false } = {}) {
    // bare: the cards only, the period picker and the stack come from the consumption tab
    const wrap = (html) => (bare ? html : `<div class="stack">${html}</div>`);
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const lang = this._hass?.language || "en";
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const today = range === "day" && off === 0;
    const win = this._balWindow(range, off);
    const picker = bare ? "" : this._rangePicker("u", range, off, win);
    const v = this._usageView;
    const u = today ? this._usage : v && v.range === range && v.off === off ? v : null;
    const head = `<div class="row"><span class="eb-title">${esc(this._t("uBaseTitle"))}</span>${!today && this._usageViewLoading ? `<span class="eb-label">…</span>` : ""}</div>${picker}`;
    if (!u) return wrap(`<div class="eb-card">${head}<div class="empty">${this._t("loading")}</div></div>`);
    const priceState = this._int?.tariffy?.price && this._hass?.states?.[this._int.tariffy.price];
    const price = priceState ? parseFloat(priceState.state) : NaN;
    const currency = String(priceState?.attributes?.unit_of_measurement || "EUR/kWh").split("/")[0] || "EUR";
    const money = (v) => this._money(v, currency).join(" ");
    const unitPrice = this._mixPrice(price, range, off); // what a kWh of a device costs in this period (solar share)
    const num = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const tile = (label, value, unit, extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div>${extra}</div>`;
    const sub = (text) => `<div class="eb-label" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(text)}</div>`;
    // 1) base load of the house
    const houseBase = u.houseBase !== undefined ? u.houseBase : this._baseline((this._history || []).map((p) => p.v));
    // Defined standby devices replace the automatic detection (a defined device is listed from 0 W).
    const defined = new Set(this._cfg.device_standby || []);
    const always = defined.size
      ? u.devices.filter((d) => defined.has(d.id) && d.baseW != null).sort((a, b) => b.baseW - a.baseW)
      : u.devices.filter((d) => d.baseW != null && d.baseW >= 2).sort((a, b) => b.baseW - a.baseW);
    // Standby loads marked as normal (meant to run all the time: server, fridge) are not avoidable.
    const normal = new Set(this._cfg.standby_normal || []);
    const baseTiles = [];
    if (houseBase != null) {
      const perYear = (houseBase / 1000) * 8760;
      const [bv, bu] = fmtPower(houseBase);
      baseTiles.push(tile(this._t("uBase"), bv, bu, sub(this._t(today ? "uBaseHint" : "uBaseHintStat"))));
      baseTiles.push(tile(this._t("uPerYear"), num(perYear, 0), "kWh"));
      if (!Number.isNaN(price)) {
        const [cn, cs] = this._money(perYear * price, currency, 0);
        baseTiles.push(tile(this._t("uCostYear"), cn, cs));
      }
    }
    if (always.length) {
      const sum = always.reduce((a, d) => a + d.baseW, 0);
      const [sv, su] = fmtPower(sum);
      baseTiles.push(tile(this._t("uExplained"), sv, su, houseBase > 0 ? sub(this._t("uOfBase", { pct: Math.round((sum / houseBase) * 100) })) : ""));
      const avW = always.filter((d) => !normal.has(d.id)).reduce((a, d) => a + d.baseW, 0);
      if (avW > 0) {
        const [av, au] = fmtPower(avW);
        const yearKwh = (avW / 1000) * 8760;
        baseTiles.push(tile(this._t("uAvoidableTile"), av, au, sub(!Number.isNaN(price) ? this._t("uYear", { kwh: num(yearKwh, 0), cost: money(yearKwh * price) }) : this._t("uYearKwh", { kwh: num(yearKwh, 0) }))));
      }
    }
    const baseCard = `<div class="eb-card">${head}${baseTiles.length ? `<div class="tiles">${baseTiles.join("")}</div>` : `<div class="empty">${this._t("uNone")}</div>`}</div>`;
    // 2) biggest consumers today
    const top = u.devices.filter((d) => d.kwh >= 0.005).sort((a, b) => b.kwh - a.kwh);
    const total = u.devices.reduce((a, d) => a + d.kwh, 0);
    const facts = (d) => {
      const f = [[this._t("uFactEnergy"), `${num(d.kwh, 2)} kWh`]];
      const evCost = this._evCostOf(d.id, range, off); // a wallbox: what EV Assistant says it cost, not the kWh at the grid price
      if (evCost != null) f.push([this._t("uFactCostEv"), money(evCost)]);
      else if (!Number.isNaN(price)) f.push([this._t("uFactCost"), money(d.kwh * unitPrice)]);
      if (d.avgW != null) f.push([this._t("uFactAvg"), fmtPower(d.avgW).join(" ")]);
      if (d.peak != null) f.push([this._t("uFactPeak"), fmtPower(d.peak).join(" ")]);
      if (d.baseW != null && d.baseW >= 2) f.push([this._t("uFactBase"), fmtPower(d.baseW).join(" ")]);
      if (d.run >= 3600000 && today) f.push([this._t("uFactRun"), this._duration(d.run / 3600000)]);
      return f;
    };
    // A row opens to the line of the device and its figures (the line also sits in the row, small).
    const row = (scope, d, name, value, unit, share, width, subtitle = "", opts = {}) => {
      const key = `usage:${scope}:${d.id}`; // each list opens its rows on its own
      const isOpen = this._open?.has(key);
      const detail = isOpen
        ? `<div class="subs">${this._sparkline(d.spark, { w: 320, h: 56, big: true })}${facts(d).map(([k, val]) => `<div class="s"><span class="sn">${esc(k)}</span><b>${esc(val)}</b></div>`).join("")}</div>`
        : "";
      return `<div class="dev"><div class="line open" data-open="${esc(key)}" role="button" tabindex="0" aria-expanded="${isOpen ? "true" : "false"}"><span class="name"><span class="nt" title="${esc(name)}">${esc(name)}</span>${subtitle ? ` <small class="cnt">${esc(subtitle)}</small>` : ""}</span>
      <span class="val">${opts.action || ""}${this._sparkline(d.spark)}${value}<small>${esc(unit)}</small>${share != null ? `<small class="pct">${share} %</small>` : ""}</span></div>
      <div class="track"><div class="fill${opts.muted ? " other" : ""}" style="width:${Math.min(100, width)}%"></div></div>${detail}</div>`;
    };
    // Both lists show as many rows as the shorter one has (within MIN_ROWS and MAX_ROWS); the rest unfolds per list.
    const lens = [top.length, ...(always.length ? [always.length] : [])];
    const limit = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.min(...lens)));
    const fold = (list, expanded, toggle) => ({
      shown: list.length > limit && !expanded ? list.slice(0, limit) : list,
      cls: expanded && list.length > limit ? " devlist" : "",
      button: list.length > limit ? `<button class="linkbtn" ${toggle}>${expanded ? this._t("showLess") : this._t("showAll", { n: list.length })}</button>` : "",
    });
    const topFold = fold(top, this._usTopExpanded, "data-ustoptoggle");
    const alwaysFold = fold(always, this._usAlwaysExpanded, "data-usalwaystoggle");
    const topRows = topFold.shown.map((d) => {
      const evCost = this._evCostOf(d.id, range, off);
      const cost = evCost != null ? money(evCost) : !Number.isNaN(price) ? money(d.kwh * unitPrice) : "";
      return row("top", d, d.name, num(d.kwh, 2), "kWh", total > 0 ? Math.round((d.kwh / total) * 100) : null, total > 0 ? (d.kwh / total) * 100 : 0, cost); // bar = share of the whole period
    }).join("");
    const topCard = `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("uTopTitle"))}</span><span class="eb-label">${num(total, 2)} kWh</span></div>
      <div class="devgrid${topFold.cls}">${topRows || `<div class="empty">${this._t("uNone")}</div>`}</div>${topFold.button}</div>`;
    // 3) always on
    // The rest of the standby loads is avoidable.
    const avoidable = always.filter((d) => !normal.has(d.id));
    const avoidableW = avoidable.reduce((a, d) => a + d.baseW, 0);
    const avoidableYear = (avoidableW / 1000) * 8760;
    const avoidableText = avoidable.length && avoidableW > 0
      ? this._t(!Number.isNaN(price) ? "uAvoidableCost" : "uAvoidableKwh", { w: fmtPower(avoidableW).join(" "), kwh: num(avoidableYear, 0), cost: !Number.isNaN(price) ? money(avoidableYear * price) : "" })
      : "";
    const alwaysRows = alwaysFold.shown.map((d) => {
      const year = (d.baseW / 1000) * 8760;
      const text = !Number.isNaN(price) ? this._t("uYear", { kwh: num(year, 0), cost: money(year * price) }) : this._t("uYearKwh", { kwh: num(year, 0) });
      const [v, unit] = fmtPower(d.baseW);
      const isNormal = normal.has(d.id);
      const action = d.id
        ? `<button type="button" class="seg snorm${isNormal ? " on" : ""}" data-standbynormal="${esc(d.id)}" aria-pressed="${isNormal}" ${this._isAdmin ? "" : "disabled"} title="${esc(this._t(isNormal ? "uNormalOnTip" : "uNormalTip"))}">${esc(this._t("uNormal"))}</button>`
        : "";
      return row("always", d, d.name, v, unit, null, houseBase > 0 ? (d.baseW / houseBase) * 100 : 0, text, { action, muted: isNormal }); // bar = share of the base load
    }).join("");
    const alwaysCard = `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("uAlwaysTitle"))}</span>${avoidableText ? `<span class="eb-label" title="${esc(this._t("uAvoidableTip"))}">${esc(avoidableText)}</span>` : ""}</div>
      <div class="devgrid${alwaysFold.cls}">${alwaysRows || `<div class="empty">${this._t("uNone")}</div>`}</div>${alwaysFold.button}
      <div class="hint">${esc(this._t(defined.size ? "uAlwaysDefined" : today ? "uAlwaysHint" : "uAlwaysHintStat"))} ${esc(this._t("uNormalHint"))}</div></div>`; // the hint sits below the list so both lists start at the same height
    // 4) energy per selected area and label, from the long-term statistics of their sensors
    // Areas, labels and devices with their own sensors stand side by side (up to three columns).
    const groupLimit = this._groupLimit();
    const spacer = ["area", "label", "device"].some((k) => (this._groupRows(k)?.length || 0) > groupLimit);
    const groupCards = ["area", "label", "device"].map((kind) => this._renderGroupEnergy(kind, { range, off, num, limit: groupLimit, spacer })).filter(Boolean);
    const groups = groupCards.length > 1 ? `<div class="cards">${groupCards.join("")}</div>` : groupCards.join("");
    const note = !today && !u.devices.length ? `<div class="hint">${esc(this._t("uNeedStats"))}</div>` : "";
    return wrap(`${baseCard}<div class="pair">${topCard}${alwaysCard}</div>${groups}${note}`);
  }

  /**
   * Card with the energy (kWh) of every selected label or area for the shown period, from the long-term
   * statistics of its sensors (see _loadGroupUsage). Empty without a selection.
   */
  /**
   * The rows of the card of a label, area or device group for the shown period (strongest first, only the ones with
   * statistics); null while the data of the period is not loaded or nothing is selected.
   */
  _groupRows(kind) {
    const selected = this._cfg[`${kind}_ids`] || [];
    const u = this._groupUsage;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    if (!selected.length || !u || u.key !== this._groupUsageKey(range, off)) return null;
    return selected
      .map((id) => ({ id, name: this._groupName(kind, id), ...this._groupIcon(kind, id), ...(u.rows?.[`${kind}:${id}`] || { kwh: 0, covered: 0, total: 0 }) }))
      .filter((r) => r.covered > 0)
      .sort((a, b) => b.kwh - a.kwh);
  }

  /**
   * The cards of the groups show as many rows as the shortest of them has (at least MIN_ROWS, at most MAX_ROWS), like
   * the lists of the biggest consumers and the standby loads; the rest unfolds per card and then scrolls.
   */
  _groupLimit() {
    const lens = ["area", "label", "device"].map((k) => this._groupRows(k)?.length).filter((n) => n > 0);
    return lens.length ? Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.min(...lens))) : MAX_ROWS;
  }

  _renderGroupEnergy(kind, { range, off, num, limit = MAX_ROWS, spacer = false }) {
    const selected = this._cfg[`${kind}_ids`] || [];
    if (!selected.length) return "";
    const title = `<div class="row"><span class="eb-title">${esc(this._t({ area: "uAreasTitle", device: "uDevicesTitle" }[kind] || "uLabelsTitle"))}</span>${this._groupUsageLoading ? `<span class="eb-label">…</span>` : ""}</div>`;
    const u = this._groupUsage;
    if (!u || u.key !== this._groupUsageKey(range, off)) return `<div class="eb-card">${title}<div class="empty">${this._t("loading")}</div></div>`;
    const rows = this._groupRows(kind) || [];
    const max = Math.max(0, ...rows.map((r) => r.kwh));
    const key = `grp:${kind}`;
    const open = this._open?.has(key);
    const folded = rows.length > limit;
    const shown = folded && !open ? rows.slice(0, limit) : rows;
    // A card without the button keeps its place when another card of the row has one, so the hints line up.
    const button = folded
      ? `<button type="button" class="linkbtn" data-open="${key}">${esc(open ? this._t("showLess") : this._t("showAll", { n: rows.length }))}</button>`
      : spacer ? `<button type="button" class="linkbtn" style="visibility:hidden" tabindex="-1" aria-hidden="true">.</button>` : "";
    const html = shown
      .map((r) => {
        const cover = r.covered < r.total ? ` <small class="cnt" title="${esc(this._t("uLabelsCoverageTip"))}">${esc(this._t("uLabelsCoverage", { n: r.covered, m: r.total }))}</small>` : "";
        return `<div class="dev"><div class="line"><span class="name">${this._iconOnly(r.icon, r.color)}<span class="nt" title="${esc(r.name)}">${esc(r.name)}</span>${cover}</span>
          <span class="val">${num(r.kwh, 2)}<small>kWh</small></span></div>
          <div class="track"><div class="fill" style="width:${max > 0 ? Math.min(100, (r.kwh / max) * 100) : 0}%"></div></div></div>`;
      })
      .join("");
    return `<div class="eb-card">${title}<div class="devgrid${open && folded ? " devlist" : ""}">${html || `<div class="empty">${this._t(u.failed ? "uNeedStats" : "uNone")}</div>`}</div>${button}<div class="hint">${esc(this._t({ area: "uAreasHint", device: "uDevicesHint" }[kind] || "uLabelsHint"))}</div></div>`;
  }

  /** Icon and color of a label or an area, the same as on the Power tab (devices have none there). */
  _groupIcon(kind, id) {
    if (kind === "area") return { icon: this._hass?.areas?.[id]?.icon || "mdi:texture-box", color: null };
    if (kind === "label") {
      const l = (this._labelData?.labels || []).find((x) => x.label_id === id);
      return { icon: l?.icon || "mdi:label", color: l?.color || null };
    }
    return { icon: null, color: null };
  }

  /** Display name of a label or an area. */
  _groupName(kind, id) {
    if (kind === "device") return this._deviceName(id); // the name of the device list, everywhere
    if (kind === "area") return this._hass?.areas?.[id]?.name || id;
    return (this._labelData?.labels || []).find((l) => l.label_id === id)?.name || id;
  }

  /** The selected labels and areas with the power sensors that belong to them: {"label:id" | "area:id": [entity_id]}. */
  _groupMemberMap() {
    const out = {};
    for (const id of this._cfg.label_ids || []) out[`label:${id}`] = this._labelMembers(id);
    for (const id of this._cfg.area_ids || []) out[`area:${id}`] = this._areaMembers(id);
    // A device with its own sensors is one sensor; it counts while it exists (like the sensors of the backend).
    for (const id of this._cfg.device_ids || []) out[`device:${id}`] = this._hass?.states?.[id] ? [id] : [];
    return out;
  }

  _groupUsageKey(range, off) {
    return `${range}:${off}:${Object.entries(this._groupMemberMap()).map(([g, m]) => `${g}=${m.join(",")}`).join(";")}`;
  }

  _maybeLoadGroupUsage() {
    const labels = (this._cfg.label_ids || []).length, areas = (this._cfg.area_ids || []).length, devices = (this._cfg.device_ids || []).length;
    if (!this._ready || this._groupUsageLoading || (!labels && !areas && !devices) || (labels && !this._labelData)) return;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const v = this._groupUsage;
    if (!v || v.key !== this._groupUsageKey(range, off) || Date.now() - v.at > 5 * 60 * 1000) this._loadGroupUsage();
  }

  /** Energy per label and area for the shown period: the statistics of their sensors, summed up (one request). */
  async _loadGroupUsage() {
    if (!this._hass || this._groupUsageLoading) return;
    this._groupUsageLoading = true;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const key = this._groupUsageKey(range, off);
    try {
      const map = this._groupMemberMap();
      const ids = [...new Set(Object.values(map).flat())];
      const kwh = await this._statsKwh(ids, this._balWindow(range, off), range);
      this._groupUsage = kwh == null
        ? { key, rows: null, failed: true, at: Date.now() }
        : {
          key, at: Date.now(),
          rows: Object.fromEntries(Object.entries(map).map(([group, members]) => {
            const have = members.filter((m) => kwh.has(m));
            return [group, { kwh: have.reduce((a, m) => a + kwh.get(m), 0), covered: have.length, total: members.length }];
          })),
        };
    } finally {
      this._groupUsageLoading = false;
      this._render();
    }
  }

  /**
   * Energy in kWh per sensor for a window from the long-term statistics (hourly or daily means of the power times
   * their duration), complete up to now: the statistics of an hour or a day only exist when it is over, so the
   * running day is taken from the hourly and the running hour from the 5-minute statistics. A Map of the sensors
   * that have statistics; null when a request fails.
   */
  /** The statistics to ask for to cover a window up to now: [from, to, period] (day, hour and 5-minute parts). */
  _statsParts(win, range) {
    const now = Date.now(), tz = this._tz();
    const to = Math.min(win.end, now);
    const live = win.end > now;
    const hourStart = live ? Math.floor(to / 3600000) * 3600000 : to;
    const p = tzParts(now, tz);
    const todayStart = zonedTime(p.y, p.m - 1, p.d, 0, tz);
    const parts = [];
    if (range === "month" || range === "year") {
      parts.push([win.start, Math.min(to, todayStart), "day"]);
      if (live) parts.push([Math.max(win.start, todayStart), hourStart, "hour"]);
    } else parts.push([win.start, hourStart, "hour"]);
    if (live && to > hourStart) parts.push([Math.max(hourStart, win.start), to, "5minute"]);
    return parts;
  }

  /** Energy in kWh of one statistics row: its mean power times its duration. */
  _rowKwh(row, period) {
    if (row.mean == null || Number.isNaN(row.mean)) return 0;
    const hours = row.end != null && row.start != null ? (Number(row.end) - Number(row.start)) / 3600000 : period === "day" ? 24 : period === "5minute" ? 1 / 12 : 1;
    return (Math.max(0, row.mean) * hours) / 1000;
  }

  /**
   * Energy in kWh per sensor and bucket of the window (the buckets of the balance: hours, days or months), from the
   * same statistics as _statsKwh. A Map of sensor -> array with one value per bucket; null when a request fails.
   */
  async _statsSeries(ids, win, range) {
    if (!ids.length) return new Map();
    const parts = this._statsParts(win, range);
    const results = await Promise.all(parts.map(([from, end, period]) => this._usStats(ids, from, end, period)));
    if (results.some((r) => r == null)) return null;
    const n = win.edges.length - 1;
    const bucketOf = (t) => {
      if (!(t >= win.edges[0] && t < win.edges[n])) return -1;
      let lo = 0, hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (win.edges[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    const series = new Map();
    results.forEach((res, i) => {
      const period = parts[i][2];
      for (const id of ids) {
        const rows = res?.[id];
        if (!rows || !rows.length) continue;
        const arr = series.get(id) || new Array(n).fill(0);
        for (const row of rows) {
          const start = Number(row.start);
          const idx = bucketOf(Number.isNaN(start) ? Date.parse(row.start) : start);
          if (idx >= 0) arr[idx] += this._rowKwh(row, period);
        }
        series.set(id, arr);
      }
    });
    return series;
  }

  async _statsKwh(ids, win, range) {
    if (!ids.length) return new Map();
    const parts = this._statsParts(win, range);
    const results = await Promise.all(parts.map(([from, end, period]) => this._usStats(ids, from, end, period)));
    if (results.some((r) => r == null)) return null;
    const kwh = new Map();
    results.forEach((res, i) => {
      const period = parts[i][2];
      for (const id of ids) {
        const rows = res?.[id];
        if (!rows || !rows.length) continue;
        let sum = kwh.get(id) ?? 0;
        for (const row of rows) {
          if (row.mean == null || Number.isNaN(row.mean)) continue;
          const hours = row.end != null && row.start != null ? (Number(row.end) - Number(row.start)) / 3600000 : period === "day" ? 24 : period === "5minute" ? 1 / 12 : 1;
          sum += (Math.max(0, row.mean) * hours) / 1000;
        }
        kwh.set(id, sum);
      }
    });
    return kwh;
  }

  /**
   * The state of the storage from the charge level sensor, the capacity and the minimum level of the settings
   * and the current charging or discharging power: what is stored and usable, the mode and when it is empty
   * (discharging) or full (charging). Null without a charge level.
   */
  /** The charge levels (0-100) of all storages: the main charge level sensor and the further ones. */
  _storageIds() {
    return [...new Set([...(this._cfg.battery_soc || []).slice(0, 1), ...(this._cfg.battery_soc_more || [])])];
  }

  /** The current charge levels (0-100) of the storages; a sensor without a value is left out. */
  _storageLevels() {
    return this._storageIds().map((id) => this._num(id)).filter((v) => v != null).map((v) => Math.max(0, Math.min(100, v)));
  }

  _storage(cur) {
    const levels = this._storageLevels();
    if (!levels.length) return null;
    const soc = levels.reduce((a, b) => a + b, 0) / levels.length; // several storages: the mean level
    const level = Math.max(0, Math.min(100, soc));
    const cap = this._cfg.battery_capacity > 0 ? this._cfg.battery_capacity : null;
    const min = Math.max(0, Math.min(100, this._cfg.battery_min_soc ?? 0));
    const out = cur?.discharge ?? 0, into = cur?.charge ?? 0;
    const mode = out >= FLOW_W ? "discharging" : into >= FLOW_W ? "charging" : "idle";
    const stored = cap != null ? (cap * level) / 100 : null;
    const usable = cap != null ? (cap * Math.max(0, level - min)) / 100 : null;
    let hours = null;
    if (mode === "discharging" && usable != null) hours = usable / (out / 1000);
    if (mode === "charging" && cap != null) hours = (cap * Math.max(0, 100 - level)) / 100 / (into / 1000);
    return { soc: level, min, cap, mode, stored, usable, power: mode === "discharging" ? out : mode === "charging" ? into : 0, hours };
  }

  /** "4 h 20 min" or "35 min". */
  _duration(hours) {
    const total = Math.max(0, Math.round(hours * 60));
    return total >= 60 ? this._t("stDur", { h: Math.floor(total / 60), m: total % 60 }) : this._t("stDurMin", { m: total });
  }

  /**
   * The storages one by one: the charge level of each charge level sensor (the first one and the further ones) and,
   * when there are as many charge, discharge or combined power sensors as storages, what each one does (the
   * sensors are matched in the order of the settings, like the energy counters).
   */
  _storageUnits() {
    const ids = this._storageIds();
    const same = (key) => ((this._cfg[key] || []).length === ids.length ? this._cfg[key] : null);
    const charge = same("battery_charge"), discharge = same("battery_discharge"), combined = same("battery_power");
    const out = [];
    ids.forEach((id, i) => {
      const raw = this._num(id);
      if (raw == null) return;
      let into = charge ? Math.abs(this._watts(charge[i]) ?? 0) : null;
      let from = discharge ? Math.abs(this._watts(discharge[i]) ?? 0) : null;
      if (into == null && from == null && combined) {
        let v = this._watts(combined[i]);
        if (v != null) {
          if (this._cfg.invert_battery) v = -v;
          from = Math.max(0, v);
          into = Math.max(0, -v);
        }
      }
      const known = into != null || from != null;
      const mode = !known ? null : (from ?? 0) >= FLOW_W ? "discharging" : (into ?? 0) >= FLOW_W ? "charging" : "idle";
      out.push({
        id, name: this._t("stUnit", { n: i + 1 }), tip: this._hass?.states?.[id]?.attributes?.friendly_name || id,
        soc: Math.max(0, Math.min(100, raw)), mode, power: mode === "discharging" ? from : mode === "charging" ? into : 0,
      });
      // When it is empty (discharging, down to the minimum level) or full (charging): the capacity is shared equally
      const u = out[out.length - 1];
      const cap = this._cfg.battery_capacity > 0 ? this._cfg.battery_capacity / ids.length : null;
      const min = Math.max(0, Math.min(100, this._cfg.battery_min_soc ?? 0));
      u.hours = null;
      if (cap != null && u.power >= FLOW_W) {
        if (mode === "discharging") u.hours = (cap * Math.max(0, u.soc - min)) / 100 / (u.power / 1000);
        else if (mode === "charging") u.hours = (cap * Math.max(0, 100 - u.soc)) / 100 / (u.power / 1000);
      }
    });
    return out;
  }

  /**
   * The usual base load: the median of the lowest hourly mean of each of the days before (from the long-term
   * statistics of the house power sensor). Null without such a sensor or with less than three full days.
   */
  async _loadBaseRef() {
    const house = this._cfg.house_power;
    if (!house || this._baseRefLoading || !this._hass) return;
    this._baseRefLoading = true;
    try {
      const end = new Date(), start = new Date(end.getTime() - 8 * 24 * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: [house],
        period: "hour",
        types: ["mean"],
        units: { power: "W" },
      });
      this._baseRef = { w: this._baseRefFrom(res?.[house] || [], end), at: Date.now() };
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics of the house power", e);
      this._baseRef = { w: null, at: Date.now() };
    } finally {
      this._baseRefLoading = false;
      this._render();
    }
  }

  _baseRefFrom(rows, now = new Date()) {
    const tz = this._tz();
    const key = (t) => { const p = tzParts(t, tz); return `${p.y}-${p.m}-${p.d}`; };
    const today = key(now instanceof Date ? now.getTime() : now);
    const days = new Map();
    for (const row of rows) {
      if (row.mean == null || Number.isNaN(row.mean)) continue;
      const t = typeof row.start === "number" ? row.start : Date.parse(row.start);
      const k = key(t);
      if (k === today) continue;
      const day = days.get(k) || { min: Infinity, n: 0 };
      day.min = Math.min(day.min, Math.max(0, row.mean));
      day.n += 1;
      days.set(k, day);
    }
    const mins = [...days.values()].filter((d) => d.n >= 18).map((d) => d.min).sort((a, b) => a - b);
    if (mins.length < 3) return null;
    const mid = mins.length >> 1;
    return mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2;
  }

  /**
   * What is usual for each device: the highest hourly mean power it reached on the days before today (from the
   * long-term statistics), so a wallbox that charges now and then is not unusual when it charges. A device without
   * 48 hourly values has no reference yet and only gets the plain notice about running for hours.
   */
  async _loadDevRef() {
    const ids = this._deviceIds();
    if (!ids.length || this._devRefLoading || !this._hass) return;
    this._devRefLoading = true;
    try {
      const end = new Date(), start = new Date(end.getTime() - 8 * 24 * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        statistic_ids: ids,
        period: "hour",
        types: ["mean"],
        units: { power: "W" },
      });
      this._devRef = { max: this._devRefFrom(res || {}, end), at: Date.now() };
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics of the devices for the notices", e);
      this._devRef = { max: {}, at: Date.now() };
    } finally {
      this._devRefLoading = false;
      this._render();
    }
  }

  _devRefFrom(res, now = new Date()) {
    const tz = this._tz();
    const key = (t) => { const p = tzParts(t, tz); return `${p.y}-${p.m}-${p.d}`; };
    const today = key(now instanceof Date ? now.getTime() : now);
    const out = {};
    for (const [id, rows] of Object.entries(res)) {
      const vals = [];
      for (const row of rows || []) {
        if (row.mean == null || !Number.isFinite(row.mean)) continue;
        const t = typeof row.start === "number" ? row.start : Date.parse(row.start);
        if (key(t) !== today) vals.push(Math.max(0, row.mean));
      }
      if (vals.length < UNUSUAL_MIN_HOURS_REF) continue;
      out[id] = Math.max(...vals);
    }
    return out;
  }

  _maybeLoadDevRef() {
    if (!this._ready || this._devRefLoading || !this._deviceIds().length) return;
    if (!this._devRef || Date.now() - this._devRef.at > 60 * 60 * 1000) this._loadDevRef();
  }

  /** Devices whose last full hours were all clearly above what is usual for them (not the ones without notices). */
  _unusualDevices() {
    const skip = new Set(this._cfg.alert_exclude || []);
    const ref = this._devRef?.max || {};
    return (this._usage?.devices || [])
      .filter((d) => !skip.has(d.id) && ref[d.id] != null && d.recent?.length === UNUSUAL_HOURS && d.recent.every((v) => v != null && v >= Math.max(ref[d.id] * UNUSUAL_FACTOR, ref[d.id] + UNUSUAL_MIN_W)))
      .map((d) => ({ ...d, avg: d.recent.reduce((a, b) => a + b, 0) / d.recent.length, ref: ref[d.id] }))
      .sort((a, b) => b.avg - b.ref - (a.avg - a.ref))
      .slice(0, 3);
  }

  _maybeLoadBaseRef() {
    if (!this._ready || this._baseRefLoading || !this._cfg.house_power) return;
    if (!this._baseRef || Date.now() - this._baseRef.at > 60 * 60 * 1000) this._loadBaseRef();
  }

  /**
   * The notices that apply now: a plant fault of PV Assistant, a negative electricity price (dynamic tariff of
   * Tariffy), devices that have been running for hours and a base load well above the usual.
   */
  _alerts() {
    const out = [];
    const lang = this._hass?.language || "en";
    const ids = this._int?.pv_assistant?.entities;
    const fault = ids?.string_fault && this._hass?.states?.[ids.string_fault];
    if (fault?.state === "on") {
      const plants = Array.isArray(fault.attributes?.plants) && fault.attributes.plants.length ? `: ${fault.attributes.plants.join(", ")}` : "";
      out.push({ level: "warn", text: this._t("alFault", { plants }) });
    }
    const price = this._price();
    if (price && price.currency && price.value < 0) {
      const ct = (price.value * 100).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      out.push({ level: "info", text: this._t("alNegPrice", { price: ct }) });
    }
    const unusual = this._unusualDevices();
    for (const d of unusual) {
      const f = (w) => fmtPower(w).join(" ");
      out.push({ level: "warn", text: this._t("alUnusual", { name: d.name, hours: UNUSUAL_HOURS, now: f(d.avg), ref: f(d.ref) }) });
    }
    // A device with a known pattern is judged by it alone (the wallbox may run for hours); the plain rule is only
    // for devices without a pattern yet, and there is one notice per device.
    const known = Object.keys(this._devRef?.max || {});
    const quiet = new Set([...(this._cfg.alert_exclude || []), ...unusual.map((d) => d.id), ...known]);
    const running = (this._usage?.devices || [])
      .filter((d) => !quiet.has(d.id) && d.run >= LONG_RUN_MS && d.run < ALWAYS_RUN_MS)
      .sort((a, b) => b.run - a.run)
      .slice(0, 3);
    for (const d of running) {
      const [v, u] = fmtPower(d.nowW ?? 0);
      out.push({ level: "warn", text: this._t("alLongRun", { name: d.name, dur: this._duration(d.run / 3600000), power: `${v} ${u}` }) });
    }
    const now = this._baseline((this._history || []).map((p) => p.v));
    const ref = this._baseRef?.w;
    if (now != null && ref != null && now >= ref * 1.5 && now - ref >= 50) {
      out.push({ level: "warn", text: this._t("alBase", { now: Math.round(now).toLocaleString(lang), ref: Math.round(ref).toLocaleString(lang) }) });
    }
    return out;
  }

  _renderAlerts() {
    const list = this._alerts();
    if (!list.length) return "";
    return `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("alTitle"))}</span></div>
      ${list.map((a) => `<div class="alert${a.level === "info" ? " info" : ""}">${a.level === "info" ? "ℹ" : "⚠"} ${esc(a.text)}</div>`).join("")}</div>`;
  }

  /** The time zone of the Home Assistant instance; the browser's if it is unknown or not usable. */
  _tz() {
    const tz = this._hass?.config?.time_zone;
    if (!tz) return undefined;
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    } catch (e) {
      return undefined;
    }
  }

  /** The balance tab exists when at least one energy counter is configured. */
  _balEnabled() {
    return ENERGY_KEYS.some((k) => (this._cfg[k] || []).length > 0) || Object.keys(this._cfg.history_years || {}).length > 0;
  }

  /**
   * The period of the balance in local time: a day (per hour), a week from Monday, a month (both per day)
   * or a calendar year (per month); `off` counts the periods back from now (0 = the current one).
   * `edges` are the starts of the buckets plus the end of the period.
   */
  _balWindow(range = this._usRange ?? "day", off = this._usOff ?? 0, { half = false } = {}) {
    const tz = this._tz();
    const now = tzParts(Date.now(), tz);
    const y = now.y, m = now.m - 1, d = now.d;
    const weekday = new Date(Date.UTC(y, m, d)).getUTCDay();
    let start, end, bucket;
    if (range === "week") {
      const monday = d - ((weekday + 6) % 7) + off * 7;
      start = zonedTime(y, m, monday, 0, tz);
      end = zonedTime(y, m, monday + 7, 0, tz);
      bucket = "day";
    } else if (range === "month") {
      start = zonedTime(y, m + off, 1, 0, tz);
      end = zonedTime(y, m + off + 1, 1, 0, tz);
      bucket = "day";
    } else if (range === "year") {
      start = zonedTime(y + off, 0, 1, 0, tz);
      end = zonedTime(y + off + 1, 0, 1, 0, tz);
      bucket = "month";
    } else {
      start = zonedTime(y, m, d + off, 0, tz);
      end = zonedTime(y, m, d + off + 1, 0, tz);
      bucket = half ? "half" : "hour"; // half: the 5-minute statistics added up to half hours
    }
    const edges = [start];
    while (edges[edges.length - 1] < end) {
      const last = edges[edges.length - 1];
      const t = tzParts(last, tz);
      edges.push(bucket === "half" ? last + 1800000 : bucket === "hour" ? last + 3600000
        : bucket === "day" ? zonedTime(t.y, t.m - 1, t.d + 1, 0, tz)
          : zonedTime(t.y, t.m, 1, 0, tz));
    }
    edges[edges.length - 1] = end;
    return { range, off, start, end, bucket, period: bucket === "half" ? "5minute" : bucket, edges };
  }

  /** The changes of the counters per bucket and category (null where a category has no counter). */
  _balBuckets(win, res) {
    const n = win.edges.length - 1;
    const out = {};
    for (const [cat, key] of BAL_CATS) {
      const ids = this._cfg[key] || [];
      if (!ids.length) continue;
      const arr = Array(n).fill(null);
      for (const id of ids) {
        for (const row of res?.[id] || []) {
          const v = row.change;
          if (v == null || Number.isNaN(v)) continue;
          const t = typeof row.start === "number" ? row.start : Date.parse(row.start);
          let lo = 0, hi = n - 1, hit = -1;
          while (lo <= hi) { // the bucket with edges[i] <= t < edges[i + 1]
            const mid = (lo + hi) >> 1;
            if (t < win.edges[mid]) hi = mid - 1;
            else if (t >= win.edges[mid + 1]) lo = mid + 1;
            else { hit = mid; break; }
          }
          if (hit >= 0) arr[hit] = (arr[hit] ?? 0) + v;
        }
      }
      out[cat] = arr;
    }
    return out;
  }

  /**
   * Rows per bucket and the totals. The consumption is the measured house counter, otherwise
   * production + import + discharge − export − charge (it needs the import counter, like the live value).
   * Self-consumption is the part of the production that was not exported, self-sufficiency the part of the
   * consumption that did not come from the grid.
   */
  _balCompute(buckets, win) {
    const n = win.edges.length - 1;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const g = (c) => (buckets[c] ? buckets[c][i] : null);
      const solar = g("solar"), imp = g("imp"), exp = g("exp"), chg = g("chg"), dis = g("dis");
      let cons = g("house");
      if (cons == null && buckets.imp && imp != null) cons = Math.max(0, (solar ?? 0) + imp + (dis ?? 0) - (exp ?? 0) - (chg ?? 0));
      rows.push({ t: win.edges[i], solar, imp, exp, chg, dis, cons });
    }
    const sum = (key) => (rows.some((r) => r[key] != null) ? rows.reduce((a, r) => a + (r[key] ?? 0), 0) : null);
    const totals = { solar: sum("solar"), imp: sum("imp"), exp: sum("exp"), chg: sum("chg"), dis: sum("dis"), cons: sum("cons") };
    this._balShares(totals);
    return { rows, totals };
  }

  /** Self-consumption and self-sufficiency from the totals (null where the data is missing). */
  _balShares(totals) {
    const share = (v) => Math.max(0, Math.min(100, v));
    totals.self = totals.solar > 0 ? share(((totals.solar - (totals.exp ?? 0)) / totals.solar) * 100) : null;
    totals.autarky = totals.cons > 0 && totals.imp != null ? share(((totals.cons - totals.imp) / totals.cons) * 100) : null;
    return totals;
  }

  /**
   * Fills the totals of a year with the values entered by hand where the statistics have nothing for that
   * kind (statistics always win). Returns the kinds that were filled.
   */
  _balManual(totals, year) {
    const hist = cleanHistory(this._cfg.history_years)[year] || {};
    const used = [];
    for (const [kind, key] of HISTORY_KINDS) {
      if (hist[kind] && !(totals[key] > 0)) {
        totals[key] = hist[kind].kwh;
        used.push(kind);
      }
    }
    if (used.length) this._balShares(totals);
    return used;
  }

  async _balFetch(win) {
    const ids = [...new Set(BAL_CATS.flatMap(([, key]) => this._cfg[key] || []))];
    if (!ids.length) return {};
    try {
      return await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(win.start).toISOString(),
        end_time: new Date(win.end).toISOString(),
        statistic_ids: ids,
        period: win.period,
        types: ["change"],
        units: { energy: "kWh" },
      });
    } catch (e) {
      console.info("Energy Assistant: could not load the statistics", e);
      return null;
    }
  }

  /**
   * The round-trip efficiency of the storage as a factor (0-1) from PV Assistant (`storage_roundtrip_total`), or null
   * when there is no such sensor or the value is not usable (text, 0 or less, above 100 %). Nothing is guessed.
   */
  _roundtrip() {
    const id = this._int?.pv_assistant?.entities?.storage_roundtrip_total;
    const v = id ? this._num(id) : null;
    return v != null && Number.isFinite(v) && v > 0 && v <= 100 ? v / 100 : null;
  }

  /**
   * What the own solar power saved in a period, in kWh and money. The kWh are what the house used of its own power:
   * the solar power used directly plus what came out of the storage (consumption minus grid import minus discharge
   * is the direct part; without a consumption: production minus feed-in minus charge). Own power is not free: every
   * kWh used directly costs the feed-in revenue it would have brought, every kWh from the storage costs that revenue
   * divided by the round-trip efficiency of the storage (the storage charges from solar only). The saving is the
   * price of the grid minus that cost for each kWh, never below 0. `x` has solar, exp, chg, dis, imp, cons (kWh).
   */
  _savedBy(x, price, feed) {
    const dis = x.dis > 0 ? x.dis : 0;
    const direct = x.cons != null && x.imp != null ? Math.max(0, x.cons - x.imp - dis) : Math.max(0, (x.solar ?? 0) - (x.exp ?? 0) - (x.chg ?? 0));
    const fi = feed != null && Number.isFinite(feed) ? Math.max(0, feed) : 0;
    const eta = this._roundtrip();
    const money = Math.max(0, direct * (price - fi) + dis * (price - (eta != null ? fi / eta : fi)));
    return { kwh: direct + dis, money, direct, dis };
  }

  /** The self-sufficiency of today for the sentence of the Power tab (the statistics of today in hours), reloaded every five minutes. */
  async _loadToday() {
    if (!this._hass || this._todayLoading) return;
    this._todayLoading = true;
    try {
      const win = this._balWindow("day", 0);
      const cur = await this._balFetch(win);
      const totals = cur != null ? this._balCompute(this._balBuckets(win, cur), win).totals : null;
      this._today = { autarky: totals?.autarky ?? null, totals, at: Date.now() };
    } finally {
      this._todayLoading = false;
      this._render();
    }
  }

  _maybeLoadToday() {
    if (!this._ready || this._todayLoading) return;
    if (!this._today || Date.now() - this._today.at > 5 * 60 * 1000) this._loadToday();
  }

  /** (Re)load the balance when the period changed or the data is older than five minutes. */
  _maybeLoadBalance() {
    if (!this._ready || this._balLoading) return;
    const b = this._bal;
    if (!b || b.range !== (this._usRange ?? "day") || b.off !== (this._usOff ?? 0) || Date.now() - b.at > 5 * 60 * 1000) this._loadBalance();
  }

  async _loadBalance() {
    if (!this._hass || this._balLoading) return;
    this._balLoading = true;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    try {
      // A day is shown in half hours (the 5-minute statistics added up); the 5-minute statistics only go back as far
      // as the recorder keeps them, so an older day falls back to hours.
      let win = this._balWindow(range, off, { half: range === "day" });
      const prev = this._balWindow(range, off - 1);
      let [cur, old] = await Promise.all([this._balFetch(win), this._balFetch(prev)]);
      if (range === "day" && cur != null && !Object.values(cur).some((rows) => rows?.length)) {
        win = this._balWindow(range, off);
        cur = await this._balFetch(win);
      }
      const data = this._balCompute(this._balBuckets(win, cur || {}), win);
      let before = old ? this._balCompute(this._balBuckets(prev, old), prev).totals : null;
      // Years without statistics fall back to the values entered by hand (statistics always win).
      let manual = null;
      if (range === "year" && cur != null) {
        const year = tzParts(win.start, this._tz()).y;
        const keys = this._balManual(data.totals, year);
        if (keys.length) manual = { year, keys };
        if (cleanHistory(this._cfg.history_years)[year - 1]) {
          before = before || {};
          this._balManual(before, year - 1);
        }
      }
      // What the wallboxes of EV Assistant charged in the period (long-term statistics of their power sensors).
      let ev = null;
      const wallboxes = [...new Set((this._int?.ev_assistant?.vehicles || []).map((v) => v.wallbox_power).filter(Boolean))];
      if (wallboxes.length && cur != null) {
        const m = await this._statsKwh(wallboxes, win, range);
        if (m && m.size) ev = [...m.values()].reduce((a, b) => a + b, 0);
      }
      // Several storages: the charge and discharge counters are matched to the storages in the order of the settings
      // (the first counter belongs to the first storage, ...), when there are as many counters as storages.
      const nStores = this._storageIds().length;
      const sumOf = (id) => {
        const rows = cur?.[id];
        if (!rows?.length) return null;
        const v = rows.reduce((a, r) => a + (Number.isFinite(r.change) ? r.change : 0), 0);
        return Number.isFinite(v) ? v : null;
      };
      const chgIds = this._cfg.energy_battery_charge || [], disIds = this._cfg.energy_battery_discharge || [];
      const units = nStores > 1 && (chgIds.length === nStores || disIds.length === nStores)
        ? Array.from({ length: nStores }, (_, i) => ({ chg: chgIds.length === nStores ? sumOf(chgIds[i]) : null, dis: disIds.length === nStores ? sumOf(disIds[i]) : null }))
        : null;
      // A past period shows the charge level at its end (long-term statistics), not the level of now.
      let socHist = null;
      const storeIds = this._storageIds();
      if (off < 0 && storeIds.length) {
        try {
          const res = await this._hass.callWS({
            type: "recorder/statistics_during_period",
            start_time: new Date(win.end - 4 * 3600000).toISOString(),
            end_time: new Date(win.end).toISOString(),
            statistic_ids: storeIds,
            period: "hour",
            types: ["mean"],
          });
          socHist = storeIds.map((id) => {
            const rows = res?.[id] || [];
            const v = rows.length ? rows[rows.length - 1].mean : null;
            return v != null && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
          });
        } catch (e) {
          socHist = storeIds.map(() => null);
        }
      }
      this._bal = { range, off, win, ...data, before, manual, ev, units, socHist, failed: cur == null, at: Date.now() };
    } finally {
      this._balLoading = false;
      this._render();
    }
  }

  /** Label of the period: the date, the week, the month or the year. */
  _balLabel(win) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const fmt = (t, o) => new Date(t).toLocaleDateString(lang, { ...o, timeZone: tz });
    if (win.range === "week") return `${fmt(win.start, { day: "numeric", month: "short" })} – ${fmt(win.end - 1, { day: "numeric", month: "short", year: "numeric" })}`;
    if (win.range === "month") return fmt(win.start, { month: "long", year: "numeric" });
    if (win.range === "year") return String(tzParts(win.start, tz).y);
    return fmt(win.start, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }

  /** Short label of a bucket on the axis ("" where the label is left out) and the full one for the table. */
  _balTick(win, i) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const d = new Date(win.edges[i]);
    if (win.bucket === "half") return tzParts(win.edges[i], tz).h % 3 === 0 && tzParts(win.edges[i], tz).mi === 0 ? d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: tz }) : "";
    if (win.bucket === "hour") return tzParts(win.edges[i], tz).h % 3 === 0 ? d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: tz }) : "";
    if (win.bucket === "month") return d.toLocaleDateString(lang, { month: "short", timeZone: tz });
    return win.range === "week" ? d.toLocaleDateString(lang, { weekday: "short", day: "numeric", timeZone: tz }) : String(tzParts(win.edges[i], tz).d);
  }

  _balRowLabel(win, i) {
    const lang = this._hass?.language || "en";
    const tz = this._tz();
    const d = new Date(win.edges[i]);
    if (win.bucket === "hour" || win.bucket === "half") return d.toLocaleString(lang, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
    if (win.bucket === "month") return d.toLocaleDateString(lang, { month: "long", year: "numeric", timeZone: tz });
    return d.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "numeric", timeZone: tz });
  }

  /**
   * The period picker of a tab: day, week, month or year and arrows with the label of the period (the next
   * period is off for the current one). `kind` is the prefix of the data attributes ("b" balance, "u"
   * consumption).
   */
  _rangePicker(kind, range, off, win) {
    return `<div class="bpick"><div class="segs">${["day", "week", "month", "year"]
      .map((r) => `<button type="button" class="seg${r === range ? " on" : ""}" data-${kind}range="${r}">${esc(this._t({ day: "bDay", week: "bWeek", month: "bMonth", year: "bYear" }[r]))}</button>`).join("")}</div>
      <div class="nav"><button type="button" class="seg" data-${kind}nav="-1" aria-label="${esc(this._t("bPrev"))}">‹</button>
        <span class="lab">${esc(this._balLabel(win))}</span>
        <button type="button" class="seg" data-${kind}nav="1" aria-label="${esc(this._t("bNext"))}" ${off >= 0 ? "disabled" : ""}>›</button></div></div>`;
  }

  // ---- the Devices tab: the energy of the devices, grouped by label ------------------------------------------

  /**
   * The categories of the Devices tab: the selected labels in their order, each with the power sensors that carry it.
   * A device that carries several labels belongs to the first one only, so nothing is counted twice.
   */
  _devCats() {
    const seen = new Set();
    return (this._cfg.label_ids || []).map((id) => {
      const label = (this._labelData?.labels || []).find((l) => l.label_id === id);
      const members = this._labelMembers(id).filter((m) => !seen.has(m));
      members.forEach((m) => seen.add(m));
      return { id, name: label?.name || id, icon: label?.icon || null, color: label?.color || null, members };
    });
  }

  _devKey(range, off) {
    return `${range}:${off}:${this._devCats().map((c) => `${c.id}=${c.members.join(",")}`).join(";")}`;
  }

  _maybeLoadDevices() {
    if (!this._ready || this._devLoading || !this._labelData || !(this._cfg.label_ids || []).length) return;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const v = this._devTab;
    if (!v || v.key !== this._devKey(range, off) || Date.now() - v.at > 5 * 60 * 1000) this._loadDevices();
  }

  /** The energy per bucket of every device of the categories for the shown period (one request per kind of statistics). */
  async _loadDevices() {
    if (!this._hass || this._devLoading) return;
    this._devLoading = true;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const key = this._devKey(range, off);
    try {
      const cats = this._devCats();
      const win = this._balWindow(range, off);
      const series = await this._statsSeries([...new Set(cats.flatMap((c) => c.members))], win, range);
      this._devTab = series == null
        ? { key, range, off, failed: true, at: Date.now() }
        : { key, range, off, win, cats, series, n: win.edges.length - 1, at: Date.now() };
    } finally {
      this._devLoading = false;
      this._render();
    }
  }

  /**
   * What the Devices tab shows, computed from the loaded statistics: per category its devices (strongest first), its
   * total and its energy per bucket, the assigned total and, with energy counters, the part of the house that no
   * category explains ("not assigned"). Null while nothing is loaded for the shown period.
   */
  _devModel() {
    const d = this._devTab;
    if (!d || d.failed) return null;
    const n = d.n;
    const sum = (arr) => arr.reduce((a, v) => a + v, 0);
    const cats = d.cats
      .map((c, i) => {
        const devices = c.members
          .map((id) => ({ id, name: this._deviceName(id), buckets: d.series.get(id) }))
          .filter((x) => x.buckets)
          .map((x) => ({ ...x, kwh: sum(x.buckets) }))
          .filter((x) => x.kwh > 0.0005)
          .sort((a, b) => b.kwh - a.kwh);
        const buckets = Array.from({ length: n }, (_, k) => devices.reduce((a, x) => a + x.buckets[k], 0));
        const own = c.color && /^[a-z-]+$/.test(c.color) ? `var(--${c.color}-color, ${DEV_COLORS[i % DEV_COLORS.length]})` : DEV_COLORS[i % DEV_COLORS.length];
        return { id: c.id, name: c.name, icon: c.icon, tint: c.color, color: own, devices, buckets, total: sum(buckets) };
      })
      .filter((c) => c.devices.length);
    const assignedBuckets = Array.from({ length: n }, (_, k) => cats.reduce((a, c) => a + c.buckets[k], 0));
    const b = this._bal;
    // The balance of a day comes in half hours, the Devices tab works with hours: add them up in pairs
    let cons = b && !b.failed ? b.rows?.map((r) => r.cons) : null;
    if (cons && b.win?.bucket === "half" && cons.length === n * 2) cons = Array.from({ length: n }, (_, k) => (cons[2 * k] == null && cons[2 * k + 1] == null ? null : (cons[2 * k] ?? 0) + (cons[2 * k + 1] ?? 0)));
    // The consumption of the house is known for the buckets that have data: a running day has none for the hours that
    // are still to come, they simply have no part that is not assigned (and no share of the house).
    const fresh = b && b.range === d.range && b.off === d.off && cons?.length === n && cons.some((v) => v != null);
    const houseBuckets = fresh ? cons : null;
    const unBuckets = houseBuckets ? houseBuckets.map((h, k) => (h == null ? 0 : Math.max(0, h - assignedBuckets[k]))) : null;
    const assigned = sum(assignedBuckets);
    const unassigned = unBuckets ? sum(unBuckets) : 0;
    return { win: d.win, n, cats, assignedBuckets, unBuckets, assigned, unassigned, total: assigned + unassigned, house: houseBuckets ? sum(houseBuckets.map((v) => v ?? 0)) : null };
  }

  /** The icon of a label as a real icon only (the plain dot that _iconHtml falls back to is drawn by the caller). */
  _iconOnly(icon, color) {
    const html = this._iconHtml(icon, color);
    return html.startsWith("<ha-icon") ? html : "";
  }

  /** A ring of the given shares with a text in the middle. */
  _donut(items, center, unit) {
    const R = 42, C = 2 * Math.PI * R;
    const total = items.reduce((a, i) => a + i.value, 0);
    if (!(total > 0)) return "";
    let acc = 0;
    const arcs = items
      .filter((i) => i.value > 0)
      .map((i) => {
        const len = (i.value / total) * C;
        const gap = items.length > 1 ? Math.min(1.6, len * 0.2) : 0;
        const arc = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${i.color}" stroke-width="11" stroke-dasharray="${Math.max(0.1, len - gap).toFixed(2)} ${(C - len + gap).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
        acc += len;
        return arc;
      })
      .join("");
    return `<svg class="donut" viewBox="0 0 100 100" role="img" aria-hidden="true"><g transform="rotate(-90 50 50)">${arcs}</g><text class="dv" x="50" y="52" text-anchor="middle">${esc(center)}</text><text class="du" x="50" y="64" text-anchor="middle">${esc(unit)}</text></svg>`;
  }

  /** The Devices tab: a ring and a stacked bar of the categories, the energy per bucket and one card per category. */
  _renderDevicesTab() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const lang = this._hass?.language || "en";
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const win = this._balWindow(range, off);
    const picker = `<div class="eb-card pickbar">${this._rangePicker("u", range, off, win)}</div>`;
    const stack = (...cards) => `<div class="stack">${[picker, ...cards].join("")}</div>`;
    const note = (key) => `<div class="eb-card"><div class="empty">${esc(this._t(key))}</div></div>`;
    if (!(this._cfg.label_ids || []).length) return stack(note("devNoLabels"));
    const d = this._devTab;
    if (!d || d.key !== this._devKey(range, off)) return stack(note("loading"));
    if (d.failed) return stack(note("uNeedStats"));
    const m = this._devModel();
    if (!m.cats.length) return stack(note("devNoData"));
    const kwh = (v) => v.toLocaleString(lang, { minimumFractionDigits: v < 100 ? 1 : 0, maximumFractionDigits: v < 100 ? 1 : 0 });
    const pct = (v, of) => (of > 0 ? Math.round((v / of) * 100) : 0);
    // The smallest first, "not assigned" always last.
    const items = m.cats.map((c) => ({ name: c.name, value: c.total, color: c.color, icon: c.icon, tint: c.tint })).sort((a, b) => a.value - b.value);
    if (m.unassigned > 0.005) items.push({ name: this._t("devUnassigned"), value: m.unassigned, color: "var(--eb-dim)", icon: null });
    const bar = items.map((i) => `<i style="flex:${i.value} 1 0;background:${i.color}" title="${esc(`${i.name}: ${kwh(i.value)} kWh`)}"></i>`).join("");
    const legend = items
      .map((i) => `<span class="dl"><i class="dot" style="background:${i.color}"></i>${this._iconOnly(i.icon, i.tint)}<span class="ln">${esc(i.name)}</span><b>${kwh(i.value)}</b><small>${pct(i.value, m.total)} %</small></span>`)
      .join("");
    const elapsed = Math.max(1, (Math.min(Date.now(), win.end) - win.start) / 86400000);
    const perDay = range === "day" ? "" : `<div class="eb-label davg">${esc(this._t("devPerDay", { v: kwh(m.total / elapsed) }))}</div>`;
    const top = `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("devTitle"))}</span><span class="eb-label">${kwh(m.total)} kWh · ${esc(this._balLabel(win))}</span></div>
      <div class="dtop"><div class="dring">${this._donut(items, kwh(m.total), "kWh")}</div>
        <div class="dside"><div class="sbar">${bar}</div><div class="dlegend">${legend}</div></div></div>
      ${perDay}${this._devChart(m, items)}</div>`;
    const denom = m.house ?? m.total;
    const cards = m.cats.map((c) => this._devCategoryCard(c, denom, kwh, pct)).join("");
    return stack(top, `<div class="cats2">${cards}</div>`);
  }

  /** Stacked bars per bucket: the smallest category at the bottom, "not assigned" on top; the tooltip lists the biggest first. */
  _devChart(m, items) {
    const lang = this._hass?.language || "en";
    const win = m.win, n = m.n;
    const layers = [...m.cats].sort((a, b) => a.total - b.total).map((c) => ({ name: c.name, color: c.color, values: c.buckets }));
    if (m.unBuckets && m.unassigned > 0.005) layers.push({ name: this._t("devUnassigned"), color: "var(--eb-dim)", values: m.unBuckets, last: true });
    const totals = Array.from({ length: n }, (_, k) => layers.reduce((a, l) => a + l.values[k], 0));
    const max = Math.max(...totals, 0.1);
    // The drawing has the real width of its box (see _wireDevChart), so the text stays readable on a phone.
    const W = Math.max(280, Math.round(this._devW || 900)), H = 170, M = { l: 6, r: 6, t: 8, b: 20 };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const slot = pw / n, barW = Math.max(2, slot * 0.64);
    const f1 = (v) => v.toFixed(1);
    const num = (v) => v.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));
    let svg = `<line x1="${M.l}" x2="${M.l + pw}" y1="${H - M.b}" y2="${H - M.b}" class="haxis"/>`;
    for (let k = 0; k < n; k++) {
      const x0 = M.l + k * slot + (slot - barW) / 2;
      let y = H - M.b;
      for (const l of layers) {
        const v = l.values[k];
        if (!(v > 0)) continue;
        const h = (v / max) * ph;
        y -= h;
        svg += `<rect x="${f1(x0)}" y="${f1(y)}" width="${f1(barW)}" height="${f1(Math.max(0.5, h))}" fill="${l.color}"/>`;
      }
      const label = this._balTick(win, k);
      if (label && k % every === 0) svg += `<text class="htick" x="${f1(M.l + k * slot + slot / 2)}" y="${H - 5}" text-anchor="middle">${esc(label)}</text>`;
      // biggest on top, smallest at the bottom, "not assigned" at the very end
      const rows = layers.filter((l) => l.values[k] > 0.0005).sort((a, b) => (a.last ? 1 : 0) - (b.last ? 1 : 0) || b.values[k] - a.values[k]).map((l) => [l.color, `${num(l.values[k])} kWh`, l.name]);
      const tip = { t: `${this._balRowLabel(win, k)} · ${num(totals[k])} kWh`, r: rows };
      svg += `<rect class="bslot" x="${f1(M.l + k * slot)}" y="${M.t}" width="${f1(slot)}" height="${ph}" data-tipj="${esc(JSON.stringify(tip))}"/>`;
    }
    return `<div class="dchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(this._t("devTitle"))}">${svg}</svg></div>`;
  }

  /** After a redraw of the Devices tab: one redraw at the real width of the chart (like the chart of the balance). */
  _wireDevChart(content) {
    const wrap = content.querySelector?.(".dchart");
    if (!wrap) return;
    const box = Math.max(280, Math.round(wrap.clientWidth || 0));
    if (wrap.clientWidth && Math.abs(box - (this._devW || 900)) > 24) {
      this._devW = box;
      this._html = null;
      this._render();
    }
  }

  /** One category: its energy and share of the house, a ring of its devices and the devices with their kWh. */
  _devCategoryCard(c, denom, kwh, pct) {
    const colors = c.devices.map((_, i) => DEV_COLORS[(i + 1) % DEV_COLORS.length]);
    const open = this._open?.has(`devtab:${c.id}`);
    const shown = open ? c.devices : c.devices.slice(0, DEV_ROWS);
    const rows = shown
      .map((x) => {
        const i = c.devices.indexOf(x);
        return `<div class="cr"><i class="dot" style="background:${colors[i]}"></i><span class="cn" title="${esc(x.name)}">${esc(x.name)}</span><b>${kwh(x.kwh)}</b><small>kWh</small><small class="cp">${pct(x.kwh, c.total)} %</small></div>`;
      })
      .join("");
    const more = c.devices.length > DEV_ROWS
      ? `<button type="button" class="linkbtn" data-open="devtab:${esc(c.id)}">${esc(open ? this._t("showLess") : this._t("showAll", { n: c.devices.length }))}</button>`
      : "";
    // clockwise from the smallest to the biggest (the list keeps the biggest first, the colors stay with their device)
    const ring = this._donut(c.devices.map((x, i) => ({ value: x.kwh, color: colors[i] })).sort((x, y) => x.value - y.value), kwh(c.total), "kWh");
    return `<div class="eb-card cat"><div class="row"><span class="eb-title">${this._iconOnly(c.icon, c.tint) || `<i class="dot" style="background:${c.color};margin-right:8px"></i>`}${esc(c.name)}</span><span class="eb-label">${kwh(c.total)} kWh · ${esc(this._t("devOfHouse", { pct: pct(c.total, denom) }))}</span></div>
      <div class="cbody"><div class="dring">${ring}</div><div class="clist">${rows}${more}</div></div></div>`;
  }

  /**
   * The consumption tab: one period picker for everything below it, the balance of the energy counters
   * (totals, change to the period before, costs, bars) and then the devices (base load, biggest consumers,
   * standby, labels). Each part only when its data is set up.
   */
  _renderConsumption() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const picker = `<div class="eb-card pickbar">${this._rangePicker("u", range, off, this._balWindow(range, off))}</div>`;
    const parts = [picker];
    if (this._balEnabled()) parts.push(this._renderResults(), this._renderBalance({ bare: true }));
    if (this._usageEnabled()) parts.push(this._renderUsage({ bare: true }));
    return `<div class="stack">${parts.join("")}</div>`;
  }

  /** "30 % vs. yesterday" and so on: the change to the period before, named after the chosen period. */
  /** Color class of a change: good (green) or bad (red) depending on whether more of it is better (production, feed-in) or worse (consumption, grid import, cost). */
  _vsClass(pct, goodUp) {
    return pct === 0 ? "" : (pct > 0) === goodUp ? " good" : " bad";
  }

  _vsText(arrow, pct, range, off) {
    return this._t(`bVs_${range}${off < 0 ? "_past" : ""}`, { arrow, pct });
  }

  /**
   * Costs of the shown period (needs Tariffy and energy counters): what the grid import cost, what the feed-in
   * earned and the balance of both, from the totals of the balance, with the change to the period before. The
   * period picker is the one of the consumption tab (same period). Valued with the price of the Tariffy
   * contract, the average of a dynamic tariff and not the live price. Empty without counters or Tariffy.
   */
  _renderPeriodCosts() {
    const tariffy = this._int?.tariffy;
    if (!tariffy || !this._balEnabled()) return "";
    const lang = this._hass?.language || "en";
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const b = this._bal;
    const win = b?.win && b.range === range && b.off === off ? b.win : this._balWindow(range, off);
    const head = `<div class="row"><span class="eb-title">${esc(this._t("costsPeriod"))}</span>${this._balLoading ? `<span class="eb-label">…</span>` : ""}</div>${this._rangePicker("u", range, off, win)}`;
    const card = (body) => `<div class="eb-card">${head}${body}</div>`;
    if (!b || b.range !== range || b.off !== off) return card(`<div class="empty">${this._t("loading")}</div>`);
    const priceState = tariffy.price && this._hass?.states?.[tariffy.price];
    const price = priceState ? parseFloat(priceState.state) : NaN;
    const t = b.totals, prev = b.before;
    if (b.failed || Number.isNaN(price) || t.imp == null) return card(`<div class="empty">${this._t("bNoData")}</div>`);
    const currency = String(priceState.attributes?.unit_of_measurement || "EUR/kWh").split("/")[0] || "EUR";
    const feed = this._feedInTariff();
    const tile = (label, amount, before, goodUp = false) => {
      const [n, sym] = this._money(amount, currency);
      let extra = "";
      if (before != null && Math.abs(before) > 0.005) {
        const pct = Math.round(((amount - before) / Math.abs(before)) * 100);
        extra = `<div class="eb-label vs${this._vsClass(pct, goodUp)}" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(this._vsText(pct > 0 ? "▲" : pct < 0 ? "▼" : "•", Math.abs(pct), range, off))}</div>`;
      }
      return `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${n}<small>${esc(sym)}</small></div>${extra}</div>`;
    };
    const cost = t.imp * price;
    const tiles = [tile(this._t("bCost"), cost, prev?.imp != null ? prev.imp * price : null)];
    if (t.exp != null && feed != null) {
      const revenue = t.exp * feed;
      tiles.push(tile(this._t("bRevenue"), revenue, prev?.exp != null ? prev.exp * feed : null, true));
      tiles.push(tile(this._t("bSaldo"), revenue - cost, prev?.imp != null && prev?.exp != null ? prev.exp * feed - prev.imp * price : null, true));
    }
    return card(`<div class="tiles">${tiles.join("")}</div><div class="hint">${esc(this._t("bPriceNote"))}</div>`);
  }

  /**
   * The results of the shown period as one friendly card: the production with the change to the period before and
   * bars, a ring with the self-consumption, the savings (needs Tariffy), what the electric car charged (EV Assistant,
   * kilometres when the consumption of the car is set) and a sentence that sums it up. Empty while the balance is not loaded or failed.
   */
  _renderResults() {
    const b = this._bal;
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    // The card is always there once the balance of the period is loaded (at night, on a day without sun, without a
    // production counter: 0 kWh), only a failed request leaves it out.
    if (!b || b.range !== range || b.off !== off || b.failed) return "";
    const lang = this._hass?.language || "en";
    const t = { ...b.totals, solar: b.totals.solar ?? 0 }, prev = b.before;
    const levels = b.socHist || this._storageLevels(); // the level at the end of a past period, now for the running one
    const num = (v, d = 0) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const ico = (name, cls = "") => (globalThis.customElements?.get?.("ha-icon") ? `<ha-icon class="rico ${cls}" icon="${name}"></ha-icon>` : "");
    const delta = (cur, before) => {
      if (before == null || !(before > 0)) return "";
      const pct = Math.round(((cur - before) / before) * 100);
      return `<div class="eb-label vs${this._vsClass(pct, true)}" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(this._vsText(pct > 0 ? "▲" : pct < 0 ? "▼" : "•", Math.abs(pct), range, off))}</div>`;
    };
    // Production: bars per bucket in four colors (by quarter of the period, like the picture of a calculator result)
    const colors = ["var(--eb-cyan)", "var(--eb-green)", "var(--eb-blue)", "var(--eb-gold)"];
    const tz = this._tz();
    const rows = b.rows, n = rows.length;
    const size = n <= 7 ? 1 : Math.ceil(n / 4); // a week keeps its days, everything else is four bars
    const groups = [];
    for (let i = 0; i < n; i += size) {
      const part = rows.slice(i, i + size), last = Math.min(n, i + size) - 1;
      const kwh = part.reduce((a, r) => a + (r.solar ?? 0), 0);
      let label;
      if (size === 1) label = this._balTick(b.win, i);
      else if (range === "year") label = `Q${groups.length + 1}`;
      else if (range === "day") label = `${tzParts(b.win.edges[i], tz).h}–${tzParts(b.win.edges[last + 1], tz).h || 24}`;
      else label = `${tzParts(b.win.edges[i], tz).d}–${tzParts(b.win.edges[last + 1] - 1, tz).d}`;
      groups.push({ kwh, label, tip: size === 1 ? this._balRowLabel(b.win, i) : `${label} · ${this._balLabel(b.win)}` });
    }
    const top = Math.max(...groups.map((g) => g.kwh), 0.001);
    const bars = groups.map((g, i) => {
      const color = colors[i % colors.length];
      return `<div class="rbar"><div class="rcol"><i style="height:${Math.max(3, Math.round((g.kwh / top) * 100))}%;background:${color}" data-tipj="${esc(JSON.stringify({ t: g.tip, r: [[color, `${num(g.kwh, 1)} kWh`, this._t("bSolar")]] }))}"></i></div><span>${esc(g.label)}</span></div>`;
    }).join("");
    // Self-consumption ring (blue = fed in, green = used) with the house in the middle
    const self = t.self != null ? Math.round(t.self) : null;
    const selfBlock = self != null ? `<div class="resself"><div class="resring">${this._donut([{ value: self, color: "var(--eb-green)" }, { value: 100 - self, color: "var(--ea-feed)" }], "", "")}<span class="mid">${RES_ART.house}</span></div>
      <div><div class="resbig">${self}<small>%</small></div><div class="reslab2">${esc(this._t("bSelf"))}</div></div></div>` : "";
    // Savings (Tariffy): self-used solar energy at the contract price plus the feed-in revenue
    const price = this._price(), feed = this._feedInTariff();
    let savings = "";
    if (price) {
      const saving = (x) => this._savedBy(x, price.value, feed).money;
      const [n2, sym] = this._money(saving(t), price.currency, 0);
      savings = `<div class="ressave" title="${esc(this._t("resSavingTip"))}"><div><div class="reslab">${esc(this._t("resCost"))}</div><div class="resub">${esc(this._t("resSaving"))}</div>
        <div class="resbig">${n2} ${esc(sym)} <span class="resper">${esc(this._t(`resPer_${range}`))}</span></div></div><span class="pig">${RES_ART.pig}</span></div>`;
    }
    // Electric car
    const cons = this._cfg.ev_consumption;
    const ev = b.ev != null && b.ev > 0.05 ? b.ev : null;
    const km = ev != null && cons > 0 ? (ev / cons) * 100 : null;
    const drive = km != null ? `<div class="resdrive"><span class="car">${RES_ART.car}</span><div><div class="resub">${esc(this._t("resDrive"))}</div><div class="resdk"><b>${num(km)}</b> ${esc(this._t("resKmElectric"))}</div></div></div>` : "";
    // The sentence under it all (**x** is bold)
    let foot = "";
    if (km != null) foot = this._t("resFootKm", { km: num(km), kwh: num(ev, ev < 100 ? 1 : 0) });
    else if (ev != null) foot = this._t("resFootEv", { kwh: num(ev, ev < 100 ? 1 : 0) });
    else if (t.autarky != null) foot = this._t("resFootSelf", { pct: Math.round(t.autarky) });
    const footHtml = esc(foot).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    return `<div class="reshero" style="--resx:${(424 + resExtra(levels)) / 400}"><div class="resillu" aria-hidden="true"><div class="resghost"></div>${RES_ART.hero(levels, this._resFlows(t, b.units, b.ev))}</div>
      <div class="eb-card eb-card--glow res"><div class="row"><span class="eb-title">${esc(this._t("resTitle"))}</span>${this._balLoading ? `<span class="eb-label">…</span>` : ""}${drive}</div>
      <div class="resgrid">
        <div class="resl"><div class="reslab">${esc(this._t(`resYield_${range}`))}</div>
          <div class="resnum"><span class="rn">${num(t.solar, t.solar < 100 ? 1 : 0)}<small>kWh</small></span><span class="stackbadge" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
          <div class="rbars">${bars}</div></div>
        <div class="resr">${selfBlock}${savings}</div>
      </div>${foot ? `<div class="resfoot">${footHtml}</div>` : ""}</div></div>`;
  }

  /**
   * A dial of the card of the Power tab: a donut with an icon in the middle, beside it the caption, the value and a line
   * below it (the status of a storage). The same style for the self-sufficiency and the storages. `segments` are the
   * parts of the donut.
   */
  _liveDial(segments, icon, value, caption, sub = "") {
    return `<div class="resself live"><div class="resring">${this._donut(segments, "", "")}<span class="mid">${icon}</span></div>
      <div class="dtext"><div class="reslab2">${esc(caption)}</div><div class="resbig">${value}<small>%</small></div>${sub}</div></div>`;
  }

  /**
   * The battery card between the power and the savings in the card of the Power tab: a small ring for each storage
   * (up to four), the status, the power and when it is empty or full. Empty without a charge level.
   */
  _liveBattery(cur) {
    const st = this._storage(cur);
    if (!st) return "";
    const lang = this._hass?.language || "en";
    const units = this._storageUnits().slice(0, 4);
    const levels = units.length ? units.map((u) => u.soc) : [st.soc];
    // A battery icon filled up to the level, in the style of the house icon of the self-sufficiency
    const battery = (v) => {
      const h = Math.round((Math.max(0, Math.min(100, v)) / 100) * 16);
      return `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="#dfe6f2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="9" y="7" width="14" height="21" rx="3"/><path d="M13 4h6"/>${h > 0 ? `<rect class="batfill" x="11.5" y="${25.5 - h}" width="9" height="${h}" rx="1.5" fill="${levelColor(v)}" stroke="none"/>` : ""}</svg>`;
    };
    // The minimum level sits at the start of the donut as its own gray part (set off like the grid share of the self-sufficiency), then the usable part in the color of the level
    const parts = (v) => {
      const lvl = Math.round(v), min = Math.min(Math.round(st.min), lvl);
      return [...(min > 0 ? [{ value: min, color: "var(--eb-muted)" }] : []), { value: lvl - min, color: levelColor(v) }, { value: 100 - lvl, color: "var(--eb-line)" }];
    };
    const perUnit = units.length <= 1 || units.every((u) => u.mode);
    // Under the value stands the power of the storage in the color of what it does (teal discharging, pink charging),
    // below it when it is empty or full (several storages: the time of each one)
    const timeAt = (hours) => new Date(Date.now() + hours * 3600000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: this._tz() });
    const modeText = (mode, power, hours = null) => {
      if (!mode) return "";
      const when = hours != null && Number.isFinite(hours) ? `<div class="dwhen">${esc(this._t(mode === "discharging" ? "stEmptyAt" : "stFullAt"))} <b>${esc(timeAt(hours))}</b></div>` : "";
      return `<div class="dstat ${mode}">${esc(fmtPower(mode !== "idle" && power > 0 ? power : 0).join(" "))}</div>${when}`;
    };
    const dials = levels.map((v, i) => this._liveDial(parts(v), battery(v), Math.round(v), levels.length > 1 ? this._t("stUnit", { n: i + 1 }) : this._t("stTitle"), units.length > 1 ? (perUnit ? modeText(units[i]?.mode, units[i]?.power, units[i]?.hours) : "") : modeText(st.mode, st.power))).join("");
    // When the sensors cannot be matched to several storages, the power stands once below, in the color of the mode
    let line = units.length > 1 && !perUnit && st.mode !== "idle" ? modeText(st.mode, st.power) : "";
    let until = "";
    if (st.hours != null && Number.isFinite(st.hours) && !(units.length > 1 && perUnit)) {
      const at = new Date(Date.now() + st.hours * 3600000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: this._tz() });
      until = `<div class="bline">${esc(this._t(st.mode === "discharging" ? "stEmptyAt" : "stFullAt"))} <b>${esc(at)}</b> · ${esc(this._t("stIn", { dur: this._duration(st.hours) }))}</div>`;
    }
    return `<div class="resm"><div class="dials">${dials}</div>${line}${until}</div>`;
  }

  /** The power with which the wallboxes of EV Assistant charge right now (W), or null when none is charging. */
  _evLive() {
    let total = 0, charging = false;
    for (const v of this._int?.ev_assistant?.vehicles || []) {
      const attrs = this._hass?.states?.[v.live]?.attributes || {};
      const live = attrs.evcc_live || attrs.home_generic_live;
      const kw = Number(live?.charge_power);
      if (live && (live.charging === true || (Number.isFinite(kw) && kw > 0.05)) && Number.isFinite(kw)) {
        total += kw * 1000;
        charging = true;
      }
    }
    return charging ? total : null;
  }

  /**
   * The picture of the Power tab: the same house as in the results card of the Consumption tab, with the power of
   * now (W) instead of the energy of a period: consumption, where it comes from, the self-sufficiency, what the
   * sun saves per hour (Tariffy) and the electric car that charges. The flows show from PIC_FLOW_W on.
   */
  _renderLiveResults(cur) {
    if (!cur || (cur.house == null && cur.solar == null && cur.gridIn == null)) return "";
    const lang = this._hass?.language || "en";
    const kw = (w) => `${Math.round(w).toLocaleString(lang)} W`; // power is always shown in whole watts
    const on = (w) => w != null && Number.isFinite(w) && w >= PIC_FLOW_W;
    const ev = this._evLive();
    const flows = {};
    for (const [key, w] of [["pv", cur.solar], ["in", cur.gridIn], ["out", cur.gridOut], ["charge", cur.charge], ["discharge", cur.discharge], ["ev", ev]]) {
      if (on(w)) flows[key] = { txt: kw(w), v: w };
    }
    const levels = this._storageLevels();
    // Where the power comes from: four bars, in the colors of the flows
    // With several storages whose sensors match them, each storage has its own part (its discharge power) in shades of teal
    const unitsLive = this._storageUnits().slice(0, 4);
    const nStores = this._storageIds().length;
    const dischargeMatched = ["battery_discharge", "battery_power"].some((k) => (this._cfg[k] || []).length === nStores);
    const perStorage = unitsLive.length > 1 && dischargeMatched && unitsLive.every((u) => u.mode);
    const shades = ["#4db6ac", "#80cbc4", "#26a69a", "#b2dfdb"];
    const storageSources = perStorage
      ? unitsLive.map((u, i) => [this._t("stUnit", { n: i + 1 }), u.mode === "discharging" ? u.power : 0, shades[i]])
      : [[this._t("storage"), cur.discharge, "var(--ea-bout)"]];
    const sources = [[this._t("grid"), cur.gridIn, "var(--eb-grid)"], [this._t("solarDirect"), cur.direct, "var(--eb-solar)"], ...storageSources].filter(([, w]) => w != null && Number.isFinite(w));
    // One bar for all sources, in the colors of the picture (solar, from storage = teal like everywhere else, grid): the width of each part is its share of the consumption
    const parts = sources.filter(([, w]) => w >= PIC_FLOW_W);
    const bars = `<div class="stackh" role="img" aria-label="${esc(parts.map(([l, w]) => `${l} ${kw(w)}`).join(", "))}">${parts.map(([label, w, color]) => `<i style="flex:${w.toFixed(2)};background:${color}" data-tipj="${esc(JSON.stringify({ t: label, r: [[color, kw(w), label]] }))}"></i>`).join("")}</div>
      <div class="stackleg${sources.length > 3 ? " many" : ""}">${sources.map(([label, w, color]) => `<span><b style="background:${color}"></b>${esc(label)} <em>${esc(kw(w))}</em></span>`).join("")}</div>`;
    const battery = this._liveBattery(cur);
    const [val, unit] = fmtPower(cur.house);
    const autarky = cur.autarky != null ? Math.round(cur.autarky) : null;
    // The self-sufficiency as a dial: green is what you cover yourself, blue the share from the grid
    const ring = autarky != null ? this._liveDial([{ value: autarky, color: "var(--eb-green)" }, { value: 100 - autarky, color: "var(--eb-blue)" }], RES_ART.house, autarky, this._t("autarky")) : "";
    // What the sun saved today (Tariffy): the self-used solar energy at the price plus the feed-in revenue, in kWh and money;
    // until the statistics of today are loaded what it saves per hour right now
    const price = this._price(), feed = this._feedInTariff();
    let savings = "";
    const day = this._today?.totals;
    if (price && day?.solar != null) {
      const saved = this._savedBy(day, price.value, feed);
      const [n, sym] = this._money(saved.money, price.currency, 2);
      const kwhTxt = saved.kwh.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      savings = `<div class="ressave" title="${esc(this._t("resSavingTip"))}"><div><div class="reslab">${esc(this._t("resCost"))}</div><div class="resub">${esc(this._t("resSaving"))} ${esc(this._t("resToday"))}</div>
        <div class="resbig">${n} ${esc(sym)} <span class="resper">${esc(kwhTxt)} kWh</span></div></div><span class="pig">${RES_ART.pig}</span></div>`;
    } else if (price && cur.solar != null) {
      const perHour = ((cur.direct || 0) / 1000) * (price.value - (feed ?? 0)) + ((cur.discharge || 0) / 1000) * (price.value - (feed ?? 0) / (this._roundtrip() ?? 1));
      const [n, sym] = this._money(Math.max(0, perHour), price.currency, 2);
      savings = `<div class="ressave"><div><div class="reslab">${esc(this._t("resCost"))}</div><div class="resub">${esc(this._t("resSaving"))}</div>
        <div class="resbig">${n} ${esc(sym)} <span class="resper">${esc(this._t("resPerHour"))}</span></div></div><span class="pig">${RES_ART.pig}</span></div>`;
    }
    let foot = "";
    if (this._today?.autarky != null) foot = this._t("liveFootToday", { pct: Math.round(this._today.autarky) });
    else if (autarky != null) foot = this._t("liveFootSelf", { pct: autarky });
    const footHtml = esc(foot).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    return `<div class="reshero fullrow" style="--resx:${(424 + resExtra(levels)) / 400}"><div class="resillu" aria-hidden="true"><div class="resghost"></div>${RES_ART.hero(levels, flows, cur.solar != null && !(cur.solar >= PIC_FLOW_W))}</div>
      <div class="eb-card eb-card--glow res"><div class="row"><span class="eb-title">${esc(this._t("liveTitle"))}</span></div>
      <div class="resgrid${battery ? " three" : ""}">
        <div class="resl">
          <div class="resnum"><span class="rn">${val}<small>${unit}</small></span>${ring}</div>
          <div class="hbars">${bars}</div></div>
        ${battery}<div class="resr">${savings}</div>
      </div>${foot ? `<div class="resfoot">${footHtml}</div>` : ""}</div></div>`;
  }

  /** The flows of the picture from the totals of the shown period (kWh): { pv, in, out, charge, discharge, ev }, each { txt, v }, or null. */
  _resFlows(totals, units = null, ev = null) {
    if (!totals) return null;
    const lang = this._hass?.language || "en";
    const txt = (v) => `${v.toLocaleString(lang, { minimumFractionDigits: v < 100 ? 1 : 0, maximumFractionDigits: v < 100 ? 1 : 0 })} kWh`;
    const out = {};
    for (const [key, src] of [["pv", "solar"], ["in", "imp"], ["out", "exp"], ["charge", "chg"], ["discharge", "dis"]]) {
      const v = totals[src];
      if (v != null && Number.isFinite(v) && v >= 0.05) out[key] = { txt: txt(v), v };
    }
    const part = (v) => (v != null && Number.isFinite(v) && v >= 0.05 ? { txt: txt(v), v } : null);
    if (part(ev)) out.ev = part(ev);
    if (units) out.units = units.map((u) => ({ charge: part(u.chg), discharge: part(u.dis) }));
    return Object.keys(out).length ? out : null;
  }

  /** The balance tab: range picker, totals with the change to the period before, costs and the bar chart. */
  _renderBalance({ bare = false } = {}) {
    // bare: the cards only, the period picker and the stack come from the consumption tab
    const wrap = (html) => (bare ? html : `<div class="stack">${html}</div>`);
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const lang = this._hass?.language || "en";
    const range = this._usRange ?? "day", off = this._usOff ?? 0;
    const b = this._bal;
    const win = b?.win && b.range === range && b.off === off ? b.win : this._balWindow(range, off);
    const picker = bare ? "" : this._rangePicker("u", range, off, win);
    const head = `<div class="row"><span class="eb-title">${esc(this._t("balTitle"))}</span>${this._balLoading ? `<span class="eb-label">…</span>` : ""}</div>${picker}`;
    if (!b || b.range !== range || b.off !== off) return wrap(`<div class="eb-card">${head}<div class="empty">${this._t("loading")}</div></div>`);
    if (b.failed) return wrap(`<div class="eb-card">${head}<div class="empty">${this._t("bNoData")}</div></div>`);
    const t = b.totals, prev = b.before;
    const kwh = (v) => v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const tile = (label, value, unit, extra = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div>${extra}</div>`;
    const delta = (cur, before, goodUp = true) => {
      if (before == null || !(before > 0) || cur == null) return "";
      const pct = Math.round(((cur - before) / before) * 100);
      const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
      return `<div class="eb-label vs${this._vsClass(pct, goodUp)}" style="margin-top:2px;text-transform:none;letter-spacing:0">${esc(this._vsText(arrow, Math.abs(pct), range, off))}</div>`;
    };
    const tiles = [];
    for (const [key, label] of [["solar", "bSolar"], ["cons", "bHouse"], ["imp", "bImport"], ["exp", "bExport"], ["chg", "bCharge"], ["dis", "bDischarge"]]) {
      if (t[key] != null) tiles.push(tile(this._t(label), kwh(t[key]), "kWh", delta(t[key], prev?.[key], key !== "cons" && key !== "imp")));
    }
    if (t.autarky != null) tiles.push(tile(this._t("bAutarky"), Math.round(t.autarky), "%", delta(t.autarky, prev?.autarky)));
    if (t.self != null) tiles.push(tile(this._t("bSelf"), Math.round(t.self), "%", delta(t.self, prev?.self)));
    if (b.manual) { // the cost entered with a value, and where the numbers come from
      for (const [kind, , label] of HISTORY_KINDS) {
        const c = cleanHistory(this._cfg.history_years)[b.manual.year]?.[kind]?.cost;
        if (c != null && b.manual.keys.includes(kind)) tiles.push(tile(`${this._t(label)} · ${this._t("bCostYear")}`, c.toLocaleString(lang, { maximumFractionDigits: 2 }), ""));
      }
    }
    const note = b.manual ? `<div class="hint">${esc(this._t("bManualNote"))}</div>` : "";
    const first = `<div class="eb-card">${head}${tiles.length ? `<div class="tiles">${tiles.join("")}</div>` : `<div class="empty">${this._t("bNoData")}</div>`}${note}</div>`;
    // Without any bar from the statistics the entered years are compared instead of an empty chart.
    const bars = b.rows.some((r) => ["solar", "cons", "imp", "exp"].some((k) => r[k] > 0));
    return wrap(`${first}${b.manual && !bars ? this._manualYearsChart(b.manual.year) : this._balanceChart(b)}`);
  }

  /** One bar per year entered by hand for every kind that has entries, the shown year highlighted. */
  _manualYearsChart(selected) {
    const lang = this._langOf();
    const hist = cleanHistory(this._cfg.history_years);
    const cards = HISTORY_KINDS.map(([kind, , label]) => {
      const years = Object.keys(hist).filter((y) => hist[y][kind]);
      if (!years.length) return "";
      const max = Math.max(...years.map((y) => hist[y][kind].kwh), 1);
      const rows = years.map((y) => `<div class="yrow${Number(y) === selected ? " on" : ""}"><span class="yname">${esc(y)}</span><span class="ytrack"><i style="width:${Math.max(1, Math.round((hist[y][kind].kwh / max) * 100))}%;background:var(${HISTORY_COLORS[kind]})"></i></span><span class="yval">${hist[y][kind].kwh.toLocaleString(lang, { maximumFractionDigits: 0 })} kWh</span></div>`).join("");
      return `<div class="ykind"><div class="eb-label"><i class="dot" style="background:var(${HISTORY_COLORS[kind]});margin-right:6px"></i>${esc(this._t(label))}</div>${rows}</div>`;
    }).join("");
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("bYearsTitle"))}</span><span class="eb-label">${esc(this._t("bManual"))}</span></div>${cards}</div>`;
  }

  _langOf() { return this._hass?.language || "en"; }

  /** Grouped bars per bucket (production, consumption, import, export) with a title tooltip and the table. */
  _balanceChart(b) {
    // With a consumption (counter of the house or derived) the house is shown with all its sources
    if (b.rows.some((r) => r.cons != null)) return this._balanceStack(b);
    return this._balanceBars(b);
  }

  /**
   * The consumption of the house with all its sources: per bucket one bar of the sources (solar used directly, from the
   * storage, from the grid) and the consumption as a white line over it. Feed-in and charging of the storage are not
   * consumption, they only show in the tooltip and the table.
   */
  _balanceStack(b) {
    const lang = this._hass?.language || "en";
    const rows = b.rows, win = b.win, n = rows.length;
    const hasSolar = rows.some((r) => r.solar != null);
    // Solar used directly is what the grid and the storage did not deliver (= production - feed-in - charging)
    const parts = rows.map((r) => {
      const imp = r.imp ?? 0, dis = r.dis ?? 0;
      return { cons: r.cons, imp, dis, direct: hasSolar && r.cons != null ? Math.max(0, r.cons - imp - dis) : 0, exp: r.exp, chg: r.chg, solar: r.solar };
    });
    const defs = [
      { key: "direct", name: this._t("bDirect"), color: "--ea-prod", on: hasSolar },
      { key: "dis", name: this._t("bDischarge"), color: "--ea-bout", on: rows.some((r) => r.dis != null) },
      { key: "imp", name: this._t("bImport"), color: "--ea-grid", on: rows.some((r) => r.imp != null) },
    ].filter((d) => d.on);
    const stackOf = (q) => defs.reduce((a, d) => a + q[d.key], 0);
    const title = `<div class="row"><span class="eb-title">${esc(this._t("balChart"))}</span><span class="eb-label">kWh</span></div>`;
    const peak = Math.max(...parts.map((q) => Math.max(q.cons ?? 0, stackOf(q))), 0);
    if (!(peak > 0)) return `<div class="eb-card">${title}<div class="empty">${this._t("bNoData")}</div></div>`;
    this._balW = this._balW || 900;
    const W = Math.max(280, Math.round(this._balW)), H = 260;
    const M = { l: 52, r: 8, t: 10, b: 24 };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const ticks = this._niceTicks(0, Math.max(peak, 0.1));
    const hi = ticks[ticks.length - 1];
    const slot = pw / n, barW = Math.max(2, slot * 0.62);
    const y = (v) => M.t + (1 - v / hi) * ph;
    const f1 = (v) => v.toFixed(1);
    const num = (v, d = 2) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    let svg = "";
    for (const v of ticks) {
      svg += `<line x1="${M.l}" x2="${M.l + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="${v === 0 ? "haxis" : "hgrid"}"/>`;
      svg += `<text class="htick" x="${M.l - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${v.toLocaleString(lang, { maximumFractionDigits: 2 })}</text>`;
    }
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));
    const points = [];
    parts.forEach((q, i) => {
      const x0 = M.l + i * slot + (slot - barW) / 2, cx = M.l + i * slot + slot / 2;
      let base = 0;
      for (const d of defs) { // the first source at the bottom
        const v = q[d.key];
        if (v > 0.0005) svg += `<rect x="${f1(x0)}" y="${f1(y(base + v))}" width="${f1(barW)}" height="${f1(y(base) - y(base + v))}" fill="var(${d.color})"/>`;
        base += v;
      }
      if (q.cons != null) points.push([cx, y(q.cons)]);
      const label = this._balTick(win, i);
      if (label && i % every === 0) svg += `<text class="htick" x="${f1(cx)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`;
    });
    if (points.length) { // the consumption: a white line over the bars
      svg += `<polyline points="${points.map(([px, py]) => `${f1(px)},${f1(py)}`).join(" ")}" fill="none" stroke="var(--eb-text)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (n <= 31) svg += points.map(([px, py]) => `<circle cx="${f1(px)}" cy="${f1(py)}" r="2.3" fill="var(--eb-text)"/>`).join("");
    }
    parts.forEach((q, i) => {
      const x0 = M.l + i * slot;
      const rowsTip = [["--eb-text", q.cons == null ? "–" : `${num(q.cons)} kWh`, this._t("bHouse")]];
      for (const d of defs) if (q[d.key] > 0.0005) rowsTip.push([d.color, `${num(q[d.key])} kWh`, d.name]);
      if (q.exp > 0.0005) rowsTip.push(["--ea-feed", `${num(q.exp)} kWh`, this._t("bExport")]);
      if (q.chg > 0.0005) rowsTip.push(["--ea-bin", `${num(q.chg)} kWh`, this._t("bCharge")]);
      // The tooltip is drawn by the panel (see _wireTips), in the style of the history chart.
      const tip = { t: this._balRowLabel(win, i), r: rowsTip };
      svg += `<rect class="bslot" x="${f1(x0)}" y="${M.t}" width="${f1(slot)}" height="${ph}" data-tipj="${esc(JSON.stringify(tip))}"/>`;
    });
    const legend = `<span><i style="background:var(--eb-text);width:14px;height:3px;border-radius:2px"></i>${esc(this._t("bHouse"))}</span>`
      + defs.map((d) => `<span><i style="background:var(${d.color})"></i>${esc(d.name)}</span>`).join("");
    // The table: the consumption, its sources and what is not consumption
    const cols = [
      { key: "cons", name: this._t("bHouse") },
      ...defs.map((d) => ({ key: d.key, name: d.name })),
      ...[["exp", "bExport"], ["chg", "bCharge"], ["solar", "bSolar"]].filter(([k]) => rows.some((r) => r[k] != null)).map(([k, l]) => ({ key: k, name: this._t(l) })),
    ];
    const cell = (q, k) => (q[k] == null ? "–" : num(q[k]));
    const sumRow = `<tr><th>${esc(this._t("bSum"))}</th>${cols.map((c) => `<td>${num(parts.reduce((a, q) => a + (q[c.key] ?? 0), 0))}</td>`).join("")}</tr>`;
    const table = parts.map((q, i) => `<tr><th>${esc(this._balRowLabel(win, i))}</th>${cols.map((c) => `<td>${cell(q, c.key)}</td>`).join("")}</tr>`).join("");
    return `<div class="eb-card">${title}<div class="hchart"><div class="legend">${legend}</div>
      <div class="chartwrap bwrap"><svg class="hsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(this._t("balChart"))}">${svg}</svg></div>
      <details class="tableview"${this._balTableOpen ? " open" : ""}><summary>${esc(this._t("hTable"))}</summary>
        <table><tr><th>${esc(this._t("bTime"))}</th>${cols.map((c) => `<th>${esc(c.name)} (kWh)</th>`).join("")}</tr>${table}${sumRow}</table></details></div></div>`;
  }

  /** Grouped bars per bucket (production, consumption, import, export): for setups without a consumption. */
  _balanceBars(b) {
    const lang = this._hass?.language || "en";
    const rows = b.rows, win = b.win;
    const defs = [
      { key: "solar", name: this._t("bSolar"), color: "--ea-prod" },
      { key: "cons", name: this._t("bHouse"), color: "--ea-house" },
      { key: "imp", name: this._t("bImport"), color: "--ea-grid" },
      { key: "exp", name: this._t("bExport"), color: "--ea-feed" },
    ].filter((d) => rows.some((r) => r[d.key] != null));
    const values = rows.flatMap((r) => defs.map((d) => r[d.key] ?? 0));
    const title = `<div class="row"><span class="eb-title">${esc(this._t("balChart"))}</span><span class="eb-label">kWh</span></div>`;
    if (!defs.length || !values.some((v) => v > 0)) return `<div class="eb-card">${title}<div class="empty">${this._t("bNoData")}</div></div>`;
    this._balW = this._balW || 900;
    const W = Math.max(280, Math.round(this._balW)), H = 260;
    const M = { l: 52, r: 8, t: 10, b: 24 };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const ticks = this._niceTicks(0, Math.max(...values, 0.1));
    const hi = ticks[ticks.length - 1];
    const n = rows.length;
    const slot = pw / n, gap = 1.5;
    const barW = Math.max(1.5, (slot - 4 - gap * (defs.length - 1)) / defs.length);
    const y = (v) => M.t + (1 - v / hi) * ph;
    const f1 = (v) => v.toFixed(1);
    const num = (v, d = 2) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    let svg = "";
    for (const v of ticks) {
      svg += `<line x1="${M.l}" x2="${M.l + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="${v === 0 ? "haxis" : "hgrid"}"/>`;
      svg += `<text class="htick" x="${M.l - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${v.toLocaleString(lang, { maximumFractionDigits: 2 })}</text>`;
    }
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));
    rows.forEach((r, i) => {
      const x0 = M.l + i * slot;
      defs.forEach((d, j) => {
        const v = r[d.key];
        if (v != null && v > 0) svg += `<rect x="${f1(x0 + 2 + j * (barW + gap))}" y="${f1(y(v))}" width="${f1(barW)}" height="${f1(y(0) - y(v))}" fill="var(${d.color})" rx="1"/>`;
      });
      const label = this._balTick(win, i);
      if (label && i % every === 0) svg += `<text class="htick" x="${f1(x0 + slot / 2)}" y="${H - 6}" text-anchor="middle">${esc(label)}</text>`;
      // The tooltip is drawn by the panel (see _wireTips), in the style of the history chart.
      const tip = { t: this._balRowLabel(win, i), r: defs.map((d) => [d.color, r[d.key] == null ? "–" : `${num(r[d.key])} kWh`, d.name]) };
      svg += `<rect class="bslot" x="${f1(x0)}" y="${M.t}" width="${f1(slot)}" height="${ph}" data-tipj="${esc(JSON.stringify(tip))}"/>`;
    });
    const legend = defs.map((d) => `<span><i style="background:var(${d.color})"></i>${esc(d.name)}</span>`).join("");
    const sumRow = `<tr><th>${esc(this._t("bSum"))}</th>${defs.map((d) => `<td>${num(rows.reduce((a, r) => a + (r[d.key] ?? 0), 0))}</td>`).join("")}</tr>`;
    const table = rows.map((r, i) => `<tr><th>${esc(this._balRowLabel(win, i))}</th>${defs.map((d) => `<td>${r[d.key] == null ? "–" : num(r[d.key])}</td>`).join("")}</tr>`).join("");
    return `<div class="eb-card">${title}<div class="hchart"><div class="legend">${legend}</div>
      <div class="chartwrap bwrap"><svg class="hsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(this._t("balChart"))}">${svg}</svg></div>
      <details class="tableview"${this._balTableOpen ? " open" : ""}><summary>${esc(this._t("hTable"))}</summary>
        <table><tr><th>${esc(this._t("bTime"))}</th>${defs.map((d) => `<th>${esc(d.name)} (kWh)</th>`).join("")}</tr>${table}${sumRow}</table></details></div></div>`;
  }

  /** After a redraw of the balance: one redraw at the real width of the chart, and the state of the table. */
  _wireBalance(content) {
    const wrap = content.querySelector?.(".bwrap");
    if (!wrap) return;
    const box = Math.max(280, Math.round(wrap.clientWidth || 0));
    if (wrap.clientWidth && Math.abs(box - (this._balW || 900)) > 24) {
      this._balW = box;
      this._html = null;
      this._render();
      return;
    }
    const details = content.querySelector("details.tableview");
    if (details) details.addEventListener("toggle", () => { this._balTableOpen = details.open; });
  }

  /** Time of an ISO timestamp state as hh:mm in the local format (null if it is not a time). */
  _time(value) {
    const d = value && !["unknown", "unavailable"].includes(value) ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString(this._hass?.language || "en", { hour: "2-digit", minute: "2-digit", timeZone: this._tz() }) : null;
  }

  /**
   * PV day figures and forecast of PV Assistant (read only): production, feed-in, self-consumption,
   * self-sufficiency, forecast reached and benefit of today; expected feed-in and best window of tomorrow;
   * usable storage energy and when it is empty; a warning for a plant fault. Empty without PV Assistant
   * or without any value.
   */
  _renderPvDay() {
    const ids = this._int?.pv_assistant?.entities;
    if (!ids) return "";
    const lang = this._hass?.language || "en";
    const state = (key) => (ids[key] ? this._hass?.states?.[ids[key]] : null);
    const num = (key) => this._num(ids[key]);
    const tile = (label, value, unit = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div></div>`;
    const fixed = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const today = [];
    const add = (list, label, key, unit, digits) => {
      const v = num(key);
      if (v != null) list.push(tile(label, fixed(v, digits), unit));
    };
    add(today, this._t("dProduction"), "production_today", "kWh", 1);
    add(today, this._t("dFeedIn"), "feed_in_today", "kWh", 1);
    add(today, this._t("dSelf"), "self_consumption_rate_today", "%", 0);
    add(today, this._t("dAutarky"), "autarky_today", "%", 0);
    add(today, this._t("dForecast"), "forecast_reached_today", "%", 0);
    const benefit = num("benefit_today");
    if (benefit != null) {
      const [n, sym] = this._money(benefit, state("benefit_today")?.attributes?.unit_of_measurement || "EUR");
      today.push(tile(this._t("dBenefit"), n, sym));
    }
    const tomorrow = [];
    add(tomorrow, this._t("dExpected"), "expected_feed_in_tomorrow", "kWh", 1);
    const start = this._time(state("best_window_tomorrow")?.state);
    if (start) {
      const end = this._time(state("best_window_tomorrow")?.attributes?.end);
      tomorrow.push(tile(this._t("dWindow"), esc(end ? `${start}–${end}` : start)));
    }
    const storage = [];
    add(storage, this._t("dStorage"), "storage_usable", "kWh", 1);
    const empty = this._time(state("storage_empty_at")?.state);
    if (empty) storage.push(tile(this._t("dEmptyAt"), esc(empty)));
    const fault = state("string_fault");
    const plants = Array.isArray(fault?.attributes?.plants) ? fault.attributes.plants.join(", ") : "";
    const alert = fault?.state === "on" ? `<div class="alert">⚠ ${esc(this._t("dFault"))}${plants ? `: ${esc(plants)}` : ""}</div>` : "";
    if (!today.length && !tomorrow.length && !storage.length && !alert) return "";
    const block = (title, tiles) => (tiles.length ? `<div class="eb-label costs">${esc(title)}</div><div class="tiles">${tiles.join("")}</div>` : "");
    return `<div class="eb-card fullrow"><div class="row"><span class="eb-title">${esc(this._t("pvDayTitle"))}</span></div>
      ${alert}${block(this._t("pvToday"), today)}${block(this._t("dStorageTitle"), storage)}${block(this._t("pvTomorrow"), tomorrow)}</div>`;
  }

  /** Value of a state as number (null if missing, unknown or not a number). */
  _num(entityId) {
    const s = entityId && this._hass?.states?.[entityId];
    const v = s ? parseFloat(s.state) : NaN;
    return Number.isNaN(v) ? null : v;
  }

  /**
   * Wallbox and vehicle of EV Assistant (read only): live status and power, charge level, solar share,
   * what was charged today and the advice to charge before the PV production starts. One row of tiles
   * per vehicle; empty without EV Assistant or without any value.
   */
  _renderEv() {
    const vehicles = this._int?.ev_assistant?.vehicles;
    if (!Array.isArray(vehicles) || !vehicles.length) return "";
    const lang = this._hass?.language || "en";
    const tile = (label, value, unit = "") => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div></div>`;
    const blocks = vehicles.map((v) => {
      const attrs = this._hass?.states?.[v.live]?.attributes || {};
      // Live data: with evcc "evcc_live", otherwise "home_generic_live". charge_power is in kW.
      const live = attrs.evcc_live || attrs.home_generic_live || null;
      const tiles = [];
      if (live) {
        const kw = Number(live.charge_power);
        const charging = live.charging === true || (Number.isFinite(kw) && kw > 0.05);
        if (charging && Number.isFinite(kw)) {
          const [val, unit] = fmtPower(kw * 1000);
          tiles.push(tile(v.name, val, unit));
        } else {
          tiles.push(tile(v.name, esc(this._t(live.connected ? "evConnected" : "evIdle"))));
        }
        const soc = Number(live.vehicle_soc);
        if (live.vehicle_soc != null && Number.isFinite(soc)) tiles.push(tile(this._t("evSoc"), Math.round(soc), "%"));
        const solar = Number(live.session_solar_pct ?? attrs.solaranteil_pct);
        if (charging && (live.session_solar_pct != null || attrs.solaranteil_pct != null) && Number.isFinite(solar)) tiles.push(tile(this._t("evSolar"), Math.round(solar), "%"));
      }
      const kwh = this._num(v.kwh_today);
      if (kwh != null) tiles.push(tile(this._t("evToday"), kwh.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "kWh"));
      const cost = this._num(v.cost_today);
      if (cost != null) {
        const unit = this._hass?.states?.[v.cost_today]?.attributes?.unit_of_measurement || "EUR";
        const [n, sym] = this._money(cost, unit);
        tiles.push(tile(this._t("evCostToday"), n, sym));
      }
      if (!tiles.length) return "";
      const advice = v.recommend && this._hass?.states?.[v.recommend]?.state === "on" ? `<div class="hint">☀ ${esc(this._t("evAdvice"))}</div>` : "";
      return `<div class="tiles">${tiles.join("")}</div>${advice}`;
    }).join("");
    return blocks ? `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("evWallbox"))}</span></div>${blocks}</div>` : "";
  }

  /** [number, symbol] of an amount, with the currency symbol of the locale where known. */
  _money(v, currency, digits = 2) {
    const lang = this._hass?.language || "en";
    let symbol = currency;
    try {
      symbol = new Intl.NumberFormat(lang, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value || currency;
    } catch (e) { /* unknown currency code: keep the code */ }
    return [v.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }), symbol];
  }

  /**
   * Money flows right now (needs Tariffy): what the grid import costs, what the feed-in earns and what
   * the directly used solar power saves, each per hour. Empty without Tariffy or without a price.
   */
  _renderCosts(cur) {
    const price = this._price();
    if (!price) return "";
    const feedIn = this._feedInTariff();
    const kw = (w) => (w == null ? null : w / 1000);
    const perHour = (w, rate) => (w == null || rate == null ? null : kw(w) * rate);
    const tiles = [];
    const tile = (label, value, unit) => `<div class="eb-tile"><div class="eb-label">${esc(label)}</div><div class="eb-value">${value}<small>${esc(unit)}</small></div></div>`;
    const priceDisplay = price.currency === "EUR"
      ? [(price.value * 100).toLocaleString(this._hass?.language || "en", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "ct/kWh"]
      : [price.value.toLocaleString(this._hass?.language || "en", { maximumFractionDigits: 4 }), `${price.currency}/kWh`];
    tiles.push(tile(this._t("tPrice"), priceDisplay[0], priceDisplay[1]));
    const money = (label, amount) => {
      if (amount == null) return;
      const [n, sym] = this._money(amount, price.currency);
      tiles.push(tile(label, n, `${sym}/h`));
    };
    money(this._t("tGridCost"), perHour(cur.gridIn, price.value));
    money(this._t("tFeedIn"), perHour(cur.gridOut, feedIn));
    money(this._t("tPvSaves"), perHour(cur.direct, price.value));
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("costsNow"))}</span></div><div class="tiles">${tiles.join("")}</div></div>`;
  }

  /**
   * Cost per selected label or area for today, this week, this month and this year, from the cost sensors that
   * Energy Assistant creates (priced step by step, so a tariff change never recalculates the past).
   * Entries without cost sensors are left out; empty when there are none.
   */
  _renderGroupCosts(kind) {
    const periods = [["day", "bDay"], ["week", "bWeek"], ["month", "bMonth"], ["year", "bYear"]];
    const sensors = { area: this._areaEnergy, device: this._deviceEnergy }[kind] || this._labelEnergy;
    const rows = (this._cfg[`${kind}_ids`] || [])
      .map((id) => {
        const values = periods.map(([p]) => {
          const state = this._hass?.states?.[sensors?.[id]?.[`cost_${p}`]];
          const v = state ? parseFloat(state.state) : NaN;
          // A wallbox: what EV Assistant says the home charging cost (the solar share is free), not the grid price
          const ev = kind === "device" ? this._evCostOf(id, p, 0) : null;
          if (ev != null) return { v: ev, unit: this._hass?.states?.[this._evVehicleOf(id).home_cost]?.attributes?.unit_of_measurement || "EUR" };
          return { v: Number.isFinite(v) ? v : null, unit: state?.attributes?.unit_of_measurement || "EUR" };
        });
        const cells = values.map((x) => (x.v == null ? "–" : this._money(x.v, x.unit).join(" ")));
        return { id, name: this._groupName(kind, id), cells, values: values.map((x) => x.v), any: cells.some((c) => c !== "–") };
      })
      .filter((r) => r.any)
      // The biggest cost first: by the year, then the month, the week and the day; the name decides between equals.
      .sort((a, b) => {
        for (const k of [3, 2, 1, 0]) {
          const d = (b.values[k] ?? -1) - (a.values[k] ?? -1);
          if (d !== 0) return d;
        }
        return a.name.localeCompare(b.name);
      });
    if (!rows.length) return "";
    const head = `<div class="lc head"><span></span>${periods.map(([, k]) => `<span class="n">${esc(this._t(k))}</span>`).join("")}</div>`;
    const body = rows
      .map((r) => `<div class="lc"><span class="nm" title="${esc(r.name)}">${esc(r.name)}</span>${r.cells.map((c) => `<span class="n">${esc(c)}</span>`).join("")}</div>`)
      .join("");
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t({ area: "areaCostTitle", device: "deviceCostTitle" }[kind] || "labelCostTitle"))}</span></div>${head}${body}<div class="hint">${esc(this._t("labelCostHint"))}</div></div>`;
  }

  /** Contract figures of Tariffy: cost so far, balance so far and the forecast for the contract end. */
  _renderContract() {
    const t = this._int?.tariffy;
    if (!t) return "";
    const tiles = [];
    for (const [label, key] of [["tCostSoFar", "cost_so_far"], ["tBalance", "balance"], ["tForecast", "forecast"]]) {
      const v = this._num(t[key]);
      if (v == null) continue;
      const [n, sym] = this._money(v, this._hass?.states?.[t[key]]?.attributes?.unit_of_measurement || "EUR");
      tiles.push(`<div class="eb-tile"><div class="eb-label">${esc(this._t(label))}</div><div class="eb-value">${n}<small>${esc(sym)}</small></div></div>`);
    }
    return tiles.length ? `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("tContract"))}</span></div><div class="tiles">${tiles.join("")}</div></div>` : "";
  }

  /**
   * Optional link to the PV Assistant integration (weskona/pv-assistant). The backend reads its
   * configuration (never changes it) and says which sensors fit which settings, and how the PV sensors
   * group into plants. Without PV Assistant the answer is null and nothing changes.
   */
  async _loadPv() {
    if (this._pvLoading || !this._hass) return;
    this._pvLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/pv_suggestion" });
      const targets = res?.targets && typeof res.targets === "object" ? res.targets : {};
      this._pv = Object.keys(targets).length
        ? { targets, notes: res.notes || {}, plants: Array.isArray(res.plants) ? res.plants : [] }
        : null;
    } catch (e) {
      console.info("Energy Assistant: could not ask for PV Assistant", e);
      this._pv = null;
    } finally {
      this._pvLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** What "take over" puts into the settings form (only fields PV Assistant has an answer for). */
  _pvTargets() {
    return this._pv.targets;
  }

  _pvApplied() {
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    return Object.entries(this._pvTargets()).every(([k, v]) => (typeof v === "boolean" ? !!this._draft[k] === v : typeof v === "number" ? this._draft[k] === v : same(v, this._draftList(k))));
  }

  /** The energy and cost sensors of the selected labels and areas: {id: {period: entity_id}} for each. */
  async _loadGroupEnergy() {
    if (!this._hass) return;
    const ask = async (type, current) => {
      try {
        const res = await this._hass.callWS({ type });
        return res && typeof res === "object" ? res : {};
      } catch (e) {
        console.warn("Energy Assistant: could not load the sensors of the labels and areas", e);
        return current || {};
      }
    };
    [this._labelEnergy, this._areaEnergy, this._deviceEnergy] = await Promise.all([
      ask("energy_assistant/label_energy", this._labelEnergy),
      ask("energy_assistant/area_energy", this._areaEnergy),
      ask("energy_assistant/device_energy", this._deviceEnergy),
    ]);
    this._render();
  }

  /** Labels of Home Assistant and the sensors that carry them (also refreshed on tab change). */
  async _loadLabels() {
    if (this._labelsLoading || !this._hass) return;
    this._labelsLoading = true;
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/labels" });
      // Never let an incomplete answer break the settings form.
      this._labelData = { labels: Array.isArray(res?.labels) ? res.labels : [], entities: res?.entities || {} };
    } catch (e) {
      console.warn("Energy Assistant: could not load labels", e);
      this._labelData = this._labelData || { labels: [], entities: {} };
    } finally {
      this._labelsLoading = false;
      this._settingsDirty = true;
      this._render();
    }
  }

  /** Settings in the shape of the settings form: lists, booleans, house_power as string or null. */
  _normalize(cfg = {}) {
    const out = { house_power: cfg.house_power || null };
    for (const k of LIST_KEYS) out[k] = Array.isArray(cfg[k]) ? [...cfg[k]] : cfg[k] ? [cfg[k]] : [];
    for (const k of BOOL_KEYS) out[k] = !!cfg[k];
    for (const k of NUMBER_KEYS) out[k] = typeof cfg[k] === "number" && Number.isFinite(cfg[k]) ? cfg[k] : null;
    out.device_names = { ...(cfg.device_names || {}) };
    out.label_tariffs = { ...(cfg.label_tariffs || {}) };
    out.area_tariffs = { ...(cfg.area_tariffs || {}) };
    out.device_tariffs = { ...(cfg.device_tariffs || {}) };
    out.history_years = cleanHistory(cfg.history_years);
    return out;
  }

  _draftList(key) {
    const v = this._draft?.[key];
    return key === "house_power" ? (v ? [v] : []) : v || [];
  }

  _draftAdd(key, id, mode) {
    if (key === "house_power") this._draft.house_power = id;
    else if (mode === "single" || mode === "soc") this._draft[key] = [id];
    else if (!this._draft[key].includes(id)) this._draft[key] = [...this._draft[key], id];
  }

  _draftRemove(key, id) {
    if (key === "house_power") this._draft.house_power = null;
    else this._draft[key] = this._draft[key].filter((x) => x !== id);
  }

  _hasSource(d = this._draft) {
    return !!(d?.house_power || d?.grid_import?.length || d?.grid_power?.length);
  }

  _isDirty() {
    return JSON.stringify(this._draft) !== JSON.stringify(this._normalize(this._config));
  }

  /** Power sensors offered in the picker. */
  /** Charge level sensors for the datalist: battery sensors and sensors in percent. */
  _socCandidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && (st.attributes?.device_class === "battery" || st.attributes?.unit_of_measurement === "%"))
      .map(([id, st]) => ({ id, name: st.attributes.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Energy counters for the datalist: sensors with the device class energy. */
  _energyCandidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "energy")
      .map(([id, st]) => ({ id, name: st.attributes.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _candidates() {
    const states = this._hass?.states || {};
    return Object.entries(states)
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "power")
      .map(([id]) => ({ id, name: this._settingsName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async _save() {
    this._status = "saving";
    this._settingsDirty = true;
    this._render();
    try {
      this._config = await this._hass.callWS({ type: "energy_assistant/update_config", config: this._draft });
      this._draft = this._normalize(this._config);
      this._history = null;
      this._lastHistory = 0;
      this._status = "saved";
      this._error = "";
      this._maybeLoadHistory();
      // The deselected sensors count at once (the backend leaves them out of the answer).
      this._loadIntegrations();
      // A newly selected label gets its sensors now; they show up a moment later.
      this._loadGroupEnergy();
      setTimeout(() => this._loadGroupEnergy(), 2000);
    } catch (e) {
      this._status = "error";
      this._error = e?.code === "no_source" ? this._t("noSource") : e?.message || String(e);
    }
    this._settingsDirty = true;
    this._render();
  }

  /** Mark a standby load as normal or avoidable and save it at once; taken back when saving fails. */
  async _toggleStandbyNormal(id) {
    if (!this._isAdmin || !id) return;
    const before = [...(this._cfg.standby_normal || [])];
    const next = before.includes(id) ? before.filter((x) => x !== id) : [...before, id];
    this._config = { ...this._cfg, standby_normal: next };
    if (this._draft) this._draft.standby_normal = [...next];
    this._html = null;
    this._render();
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/update_config", config: { standby_normal: next } });
      this._config = res;
      if (this._draft) this._draft.standby_normal = [...(res.standby_normal || [])];
    } catch (e) {
      console.warn("Energy Assistant: could not save the standby marking", e);
      this._config = { ...this._cfg, standby_normal: before };
      if (this._draft) this._draft.standby_normal = [...before];
    }
    this._html = null;
    this._render();
  }

  /** Start renaming a sensor in the device list. The row turns into a text field. */
  _startRename(id) {
    if (!this._isAdmin) return;
    this._editName = id;
    const content = this.shadowRoot.getElementById("content");
    this._html = this._renderHouse();
    this._swapMarkup(content, this._html);
    const input = content.querySelector("input[data-rename-input]");
    input?.focus();
    input?.select();
  }

  _endRename() {
    this._editName = null;
    this._html = null;
    this._render();
  }

  /** Save the new name. An empty name or the original name resets it. Admins only. */
  async _commitRename(id, value) {
    if (this._editName !== id) return; // already saved or cancelled (blur after Enter or Escape)
    const before = { ...(this._cfg.device_names || {}) };
    const names = { ...before };
    const original = this._autoName(id);
    const name = String(value).trim().slice(0, 80);
    if (!name || name === original) delete names[id];
    else names[id] = name;
    if (JSON.stringify(names) === JSON.stringify(before) || !this._isAdmin) {
      this._endRename();
      return;
    }
    // Show the new name at once, take it back if saving fails.
    this._config = { ...this._cfg, device_names: names };
    if (this._draft) this._draft.device_names = { ...names };
    this._endRename();
    try {
      const res = await this._hass.callWS({ type: "energy_assistant/update_config", config: { device_names: names } });
      this._config = res;
      if (this._draft) this._draft.device_names = { ...(res.device_names || {}) };
    } catch (e) {
      console.warn("Energy Assistant: could not save the name", e);
      this._config = { ...this._cfg, device_names: before };
      if (this._draft) this._draft.device_names = { ...before };
    }
    this._html = null;
    this._render();
  }

  _onClick(e) {
    // A click on the empty part of a tag box goes to its input.
    const tagBox = e.target.closest?.(".tags");
    if (tagBox && !e.target.closest("button, input")) tagBox.querySelector("input")?.focus();
    const ren = e.target.closest("[data-rename]");
    if (ren) {
      this._startRename(ren.dataset.rename);
      return;
    }
    const histAdd = e.target.closest("[data-histadd]");
    if (histAdd && this._isAdmin) {
      this._fieldError = {};
      this._addHistory();
      return;
    }
    const histRm = e.target.closest("[data-histrm]");
    if (histRm && this._isAdmin) {
      this._fieldError = {};
      const [year, kind] = histRm.dataset.histrm.split(":");
      const next = JSON.parse(JSON.stringify(this._draft.history_years || {}));
      if (next[year]) { delete next[year][kind]; if (!Object.keys(next[year]).length) delete next[year]; }
      this._draft.history_years = next;
      if (this._histForm?.id === histRm.dataset.histrm) this._histForm = null;
      this._edited();
      return;
    }
    const histEdit = e.target.closest("[data-histedit]");
    if (histEdit && this._isAdmin) {
      this._fieldError = {};
      const id = histEdit.dataset.histedit, [year, kind] = id.split(":");
      const v = this._draft.history_years?.[year]?.[kind];
      if (v) this._histForm = { id, year, kind, kwh: v.kwh, cost: v.cost ?? "" };
      this._edited();
      return;
    }
    if (e.target.closest("[data-histcancel]") && this._isAdmin) {
      this._fieldError = {};
      this._histForm = null;
      this._edited();
      return;
    }
    this._fieldError = {};
    const rm = e.target.closest("[data-remove]");
    const bulk = e.target.closest("[data-bulk]");
    const seg = e.target.closest("[data-seg]");
    const lseg = e.target.closest("[data-lseg]");
    const aseg = e.target.closest("[data-aseg]");
    if (lseg || aseg) {
      const kind = lseg ? "label" : "area";
      const P = PICKERS[kind];
      const [group, value] = (lseg || aseg).dataset[P.seg].split(":");
      this[P.state[group === "state" ? 1 : 2]] = value;
      this._edited();
    } else if (seg) {
      // View filters of the match list. They also decide what the bulk buttons act on.
      const [group, value] = seg.dataset.seg.split(":");
      if (group === "state") this._fState = value;
      else this._fSel = value;
      this._edited();
    } else if (e.target.closest("[data-urange]")) {
      this._usRange = e.target.closest("[data-urange]").dataset.urange;
      this._usOff = 0;
      this._render();
    } else if (e.target.closest("[data-unav]")) {
      const next = (this._usOff ?? 0) + Number(e.target.closest("[data-unav]").dataset.unav);
      if (next <= 0) {
        this._usOff = next;
        this._render();
      }
    } else if (e.target.closest("[data-energyapply]") && this._isAdmin && this._energyOffer) {
      Object.assign(this._draft, Object.fromEntries(Object.entries(this._energyOffer.targets).map(([k, v]) => [k, [...v]])));
      this._edited();
    } else if (e.target.closest("[data-pvapply]") && this._isAdmin && this._pv) {
      Object.assign(this._draft, this._pvTargets());
      this._edited();
    } else if (e.target.closest("[data-standbynormal]")) {
      // Mark a standby load as normal (or not): saved at once, no settings page needed.
      e.preventDefault();
      this._toggleStandbyNormal(e.target.closest("[data-standbynormal]").dataset.standbynormal);
    } else if (e.target.closest("[data-devsel]")) {
      // A device gets (or loses) its own energy and cost sensors; nothing happens before Save.
      e.preventDefault();
      if (this._isAdmin) {
        const id = e.target.closest("[data-devsel]").dataset.devsel;
        const list = this._draft.device_ids || [];
        if (list.includes(id)) this._draft.device_ids = list.filter((x) => x !== id);
        else this._draft.device_ids = [...list, id];
        this._edited();
      }
    } else if (e.target.closest("[data-open]")) {
      // Click on an area or label row: show or hide the sensors it sums up.
      const key = e.target.closest("[data-open]").dataset.open;
      this._open = this._open || new Set();
      if (!this._open.delete(key)) this._open.add(key);
      this._settingsDirty = true; // the settings page is only redrawn when it is marked as changed
      this._render();
    } else if (e.target.closest("[data-ustoptoggle]")) {
      this._usTopExpanded = !this._usTopExpanded;
      this._render();
    } else if (e.target.closest("[data-usalwaystoggle]")) {
      this._usAlwaysExpanded = !this._usAlwaysExpanded;
      this._render();
    } else if (e.target.closest("[data-devtoggle]")) {
      this._devExpanded = !this._devExpanded;
      this._render();
    } else if (e.target.closest("[data-areatoggle]")) {
      this._areaExpanded = !this._areaExpanded;
      this._render();
    } else if (e.target.closest("[data-labeltoggle]")) {
      this._labelExpanded = !this._labelExpanded;
      this._render();
    } else if (rm && this._isAdmin) {
      this._draftRemove(rm.dataset.remove, rm.dataset.id);
      this._edited();
    } else if (bulk && this._isAdmin) {
      // Applies to the sensors currently shown (respects the filter).
      const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
      const ids = this._matchList().shown.filter((id) => !byPattern(id));
      const rest = this._draft.device_exclude.filter((id) => !ids.includes(id));
      this._draft.device_exclude = bulk.dataset.bulk === "exclude" ? [...rest, ...ids] : rest;
      this._edited();
    } else if (e.target.closest("[data-save]") && this._isAdmin && !this._saveDisabled()) {
      this._save();
    } else if (e.target.closest("[data-discard]")) {
      this._histForm = null;
      this._draft = this._normalize(this._config);
      this._edited();
    }
  }

  _onChange(e) {
    const t = e.target;
    if (!this._isAdmin) return;
    this._fieldError = {};
    if (t.dataset?.source !== undefined) {
      const id = t.dataset.source;
      const rest = (this._draft.source_exclude || []).filter((x) => x !== id);
      this._draft.source_exclude = t.checked ? rest : [...rest, id];
      this._edited();
    } else if (t.dataset?.area) {
      const id = t.dataset.area;
      const rest = this._draft.area_ids.filter((x) => x !== id);
      this._draft.area_ids = t.checked ? [...rest, id] : rest;
      this._edited();
    } else if (t.dataset?.devname !== undefined) {
      const id = t.dataset.devname;
      const next = { ...(this._draft.device_names || {}) };
      const text = t.value.trim();
      // The field shows the name the sensors get anyway (the display name, else the name without "Leistung").
      // Only a different name is stored, so an untouched name keeps following the sensor.
      const automatic = this._autoName(id);
      if (text && text !== automatic) next[id] = text.slice(0, 80);
      else delete next[id];
      this._draft.device_names = next;
      this._edited();
    } else if (t.dataset?.devtariff !== undefined) {
      const next = { ...(this._draft.device_tariffs || {}) };
      if (t.value) next[t.dataset.devtariff] = t.value;
      else delete next[t.dataset.devtariff];
      this._draft.device_tariffs = next;
      this._edited();
    } else if (t.dataset?.labeltariff || t.dataset?.areatariff) {
      const kind = t.dataset.areatariff ? "area" : "label";
      const id = t.dataset[`${kind}tariff`];
      const next = { ...(this._draft[`${kind}_tariffs`] || {}) };
      if (t.value) next[id] = t.value;
      else delete next[id];
      this._draft[`${kind}_tariffs`] = next;
      this._edited();
    } else if (t.dataset?.label) {
      const id = t.dataset.label;
      const rest = this._draft.label_ids.filter((x) => x !== id);
      this._draft.label_ids = t.checked ? [...rest, id] : rest;
      this._edited();
    } else if (t.dataset?.device) {
      const id = t.dataset.device;
      const rest = this._draft.device_exclude.filter((x) => x !== id);
      this._draft.device_exclude = t.checked ? rest : [...rest, id];
      this._edited();
    } else if (t.dataset?.bool) {
      this._draft[t.dataset.bool] = t.checked;
      this._edited();
    } else if (t.dataset?.num) {
      // A number (kWh, %): empty or unusable means not set.
      const raw = t.value.trim().replace(",", ".");
      const n = raw === "" ? NaN : Number(raw);
      this._draft[t.dataset.num] = Number.isFinite(n) && n >= 0 ? n : null;
      this._edited();
    } else if (t.dataset?.add) {
      const id = t.value.trim();
      if (!id) return;
      if (t.dataset.mode === "text") {
        const pattern = id.toLowerCase();
        if (PATTERN_RE.test(pattern)) {
          this._draftAdd(t.dataset.add, pattern, "text");
          this._fieldError = {};
        } else {
          this._fieldError = { [t.dataset.add]: this._t("invalidPattern") };
        }
      } else if (this._hass?.states?.[id]) {
        this._draftAdd(t.dataset.add, id, t.dataset.mode);
        this._fieldError = {};
      } else {
        this._fieldError = { [t.dataset.add]: this._t("unknownSensor", { id }) };
      }
      this._edited(t.dataset.add);
    }
  }

  /** Typing in the filter box only redraws the match list, so the box keeps its focus. */
  _onInput(e) {
    for (const kind of ["label", "area"]) {
      const P = PICKERS[kind];
      if (e.target.dataset?.[P.filter] === undefined) continue;
      this[P.state[0]] = e.target.value.toLowerCase();
      const list = this.shadowRoot.getElementById(P.list);
      if (list) list.innerHTML = this._renderPickerRows(kind, !this._isAdmin);
      return;
    }
    if (e.target.dataset?.filter === undefined) return;
    this._filter = e.target.value.toLowerCase();
    const list = this.shadowRoot.getElementById("mlist");
    if (list) list.innerHTML = this._renderMatchRows(!this._isAdmin);
  }

  _edited(focusKey) {
    this._status = "";
    this._settingsDirty = true;
    // The form is redrawn as a whole. Keep the scroll position of the long lists so ticking a
    // checkbox does not throw the list back to its start.
    const scrolls = ["mlist", "llist", "alist"].map((id) => [id, this.shadowRoot.getElementById(id)?.scrollTop]);
    this._render();
    for (const [id, top] of scrolls) {
      const list = this.shadowRoot.getElementById(id);
      if (top && list) list.scrollTop = top;
    }
    if (focusKey) this.shadowRoot.querySelector(`input[data-add="${focusKey}"]`)?.focus();
  }

  _saveDisabled() {
    return !this._isAdmin || this._status === "saving" || !this._isDirty() || !this._hasSource();
  }

  /** Sensors that match the patterns (also the excluded ones), filtered by the filter box. */
  _matchList() {
    const found = this._discoverDevices(this._draft.device_patterns, this._draft, { ignoreExclude: true });
    const states = this._hass?.states || {};
    const q = (this._filter || "").trim();
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    // Active = at least IDLE_W right now. Inactive also covers sensors without a value.
    const info = new Map(
      found.map((id) => {
        const w = this._watts(id);
        return [id, { active: w != null && w >= IDLE_W, excluded: excluded.has(id) || byPattern(id) }];
      }),
    );
    const count = (fn) => found.filter((id) => fn(info.get(id))).length;
    const counts = {
      all: found.length,
      active: count((i) => i.active),
      idle: count((i) => !i.active),
      included: count((i) => !i.excluded),
      excluded: count((i) => i.excluded),
    };
    const fState = this._fState || "all";
    const fSel = this._fSel || "all";
    const shown = found.filter((id) => {
      const i = info.get(id);
      if (fState === "active" && !i.active) return false;
      if (fState === "idle" && i.active) return false;
      if (fSel === "included" && i.excluded) return false;
      if (fSel === "excluded" && !i.excluded) return false;
      return !q || `${states[id]?.attributes?.friendly_name || ""} ${this._settingsName(id)} ${id}`.toLowerCase().includes(q);
    });
    return { found, shown, counts };
  }

  _renderMatchRows(ro) {
    const { shown } = this._matchList();
    const states = this._hass?.states || {};
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    const ids = this._draft.device_ids || [];
    if (!shown.length) return `<div class="hint" style="padding:10px">${esc(this._t("noMatches"))}</div>`;
    return shown
      .map((id) => {
        const viaPattern = byPattern(id);
        const off = excluded.has(id) || viaPattern;
        const name = this._settingsName(id);
        const title = viaPattern ? `${id} – ${this._t("excludedByPattern")}` : id;
        const own = ids.includes(id);
        const sensors = off && !own ? "" : `<button type="button" class="seg msens${own ? " on" : ""}" data-devsel="${esc(id)}" ${ro ? "disabled" : ""} title="${esc(this._t("devSensorsTip"))}">${esc(this._t("devSensorsBtn"))}</button>`;
        return `<label class="mrow${off ? " ex" : ""}" title="${esc(title)}"><input type="checkbox" data-device="${esc(id)}" ${off ? "" : "checked"} ${ro || viaPattern ? "disabled" : ""}><span class="mt"><span class="mn">${esc(name)}</span><span class="mi">${esc(id)}</span></span>${sensors}</label>`;
      })
      .join("");
  }

  /** Items of a pick list: labels from the label list, areas from the areas of Home Assistant. */
  _pickerItems(kind) {
    if (kind === "label") {
      return this._labelData ? this._labelData.labels.map((l) => ({ id: l.label_id, name: l.name, icon: l.icon, color: l.color })) : null;
    }
    return Object.entries(this._hass?.areas || {})
      .map(([id, a]) => ({ id, name: a.name || id, icon: a.icon || null, color: null }))
      .sort((x, y) => x.name.localeCompare(y.name));
  }

  _pickerMembers(kind, id, cfg) {
    return kind === "label" ? this._labelMembers(id, cfg) : this._areaMembers(id, cfg);
  }

  /**
   * Entries of a pick list: only items that have power sensors (plus already selected ones, so they
   * can be unselected again), with the summed power of their sensors and the filters applied.
   */
  _picker(kind) {
    const P = PICKERS[kind];
    const [fFilter, fState, fSel] = P.state;
    const selected = new Set(this._draft[P.key]);
    const all = (this._pickerItems(kind) || [])
      .map((item) => {
        // Same count as the card: sensors of the energy balance and excluded sensors do not count.
        const members = this._pickerMembers(kind, item.id, this._draft);
        const w = members.reduce((a, id) => a + (this._watts(id) || 0), 0);
        return { item, n: members.length, w, selected: selected.has(item.id) };
      })
      .filter((x) => x.n > 0 || x.selected);
    const count = (fn) => all.filter(fn).length;
    const counts = {
      all: all.length,
      active: count((x) => x.w >= IDLE_W),
      idle: count((x) => x.w < IDLE_W),
      selected: count((x) => x.selected),
      unselected: count((x) => !x.selected),
    };
    const q = (this[fFilter] || "").trim();
    const stateFilter = this[fState] || "all";
    const selFilter = this[fSel] || "all";
    const shown = all.filter((x) => {
      if (stateFilter === "active" && x.w < IDLE_W) return false;
      if (stateFilter === "idle" && x.w >= IDLE_W) return false;
      if (selFilter === "selected" && !x.selected) return false;
      if (selFilter === "unselected" && x.selected) return false;
      return !q || `${x.item.name} ${x.item.id}`.toLowerCase().includes(q);
    });
    return { all, shown, counts };
  }

  _renderPickerRows(kind, ro) {
    const P = PICKERS[kind];
    const { shown } = this._picker(kind);
    if (!shown.length) return `<div class="hint" style="padding:10px">${esc(this._t(P.noMatches))}</div>`;
    return shown
      .map(({ item: l, n, w, selected }) => {
        const icon = this._iconHtml(l.icon || P.icon, l.color);
        const sub = this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }) + (w >= IDLE_W ? ` · ${fmtPower(w).join(" ")}` : "");
        return `<label class="mrow"><input type="checkbox" data-${P.attr}="${esc(l.id)}" ${selected ? "checked" : ""} ${ro ? "disabled" : ""}><span class="mt"><span class="mn">${icon}<span class="nt">${esc(l.name)}</span></span><span class="mi">${esc(sub)}</span></span></label>`;
      })
      .join("");
  }

  /** Checkbox list with filters of the labels or areas that exist in Home Assistant. */
  _renderPicker(kind, ro) {
    const P = PICKERS[kind];
    const [fFilter, fState, fSel] = P.state;
    if (kind === "label" && !this._labelData) return `<div class="hint">${esc(this._t("loading"))}</div>`;
    if (!(this._pickerItems(kind) || []).length) return `<div class="hint">${esc(this._t(P.empty))}</div>`;
    const { all, counts } = this._picker(kind);
    if (!all.length) return `<div class="hint">${esc(this._t(P.nonePower))}</div>`;
    const seg = (group, value, key, tipKey) => {
      const on = (group === "state" ? this[fState] || "all" : this[fSel] || "all") === value;
      return `<button type="button" class="seg${on ? " on" : ""}" data-${P.seg}="${group}:${value}"${tipKey ? ` title="${esc(this._t(tipKey))}"` : ""}>${esc(this._t(key))} <small>${counts[value]}</small></button>`;
    };
    return `<div class="mbar"><input type="text" data-${P.filter} value="${esc(this[fFilter] || "")}" placeholder="${esc(this._t(P.placeholder))}" autocomplete="off" style="flex:1 1 160px;width:auto"></div>
      <div class="segs"><span class="seglab">${esc(this._t("filterGroupState"))}</span>${seg("state", "all", "filterAll")}${seg("state", "active", "filterActive", "filterActiveTip")}${seg("state", "idle", "filterIdle", "filterIdleTip")}<span class="sep"></span><span class="seglab">${esc(this._t("filterGroupSel"))}</span>${seg("sel", "all", "filterAll")}${seg("sel", "selected", "filterSelected")}${seg("sel", "unselected", "filterUnselected")}</div>
      <div class="mlist" id="${P.list}">${this._renderPickerRows(kind, ro)}</div>`;
  }

  _labelPicker() { return this._picker("label"); }
  _renderLabelRows(ro) { return this._renderPickerRows("label", ro); }
  _renderLabelPicker(ro) { return this._renderPicker("label", ro); }

  /**
   * Tariff per selected label or area (Tariffy): which electricity contract prices the cost sensors, e.g. the
   * heat pump tariff for the heat pump label. Only offered when Tariffy has more than one electricity contract;
   * the first contract is the default.
   */
  _renderGroupTariffs(kind, ro) {
    const prices = this._int?.tariffy?.prices;
    const selected = this._draft[`${kind}_ids`] || [];
    if (!Array.isArray(prices) || prices.length < 2 || !selected.length) return "";
    const chosen = this._draft[`${kind}_tariffs`] || {};
    const rows = selected
      .map((id) => {
        const name = this._groupName(kind, id);
        const options = [
          `<option value="">${esc(this._t("tariffDefault", { name: prices[0].name }))}</option>`,
          ...prices.map((p) => `<option value="${esc(p.entity)}"${chosen[id] === p.entity ? " selected" : ""}>${esc(p.name)}</option>`),
        ].join("");
        return `<div class="trow"><span class="tn" title="${esc(name)}">${esc(name)}</span><select data-${kind}tariff="${esc(id)}" ${ro ? "disabled" : ""}>${options}</select></div>`;
      })
      .join("");
    return `<div class="fld span"><label>${esc(this._t(`f_${kind}_tariffs`))}</label>${rows}<div class="hint">${esc(this._t(`h_${kind}_tariffs`))}</div></div>`;
  }

  /** "5 devices selected: 40 sensors" and what a selection does (nothing is selected at first). */
  _deviceCounter() {
    const n = (this._draft.device_ids || []).length;
    const perDevice = this._int?.tariffy ? 8 : 4;
    return this._t(n ? "deviceCounter" : "deviceCounterNone", { n, sensors: n * perDevice });
  }

  /**
   * Name and tariff of every device with its own sensors. The name field is prefilled with the name the sensors
   * would get (the display name, else the sensor name without "Leistung"); a name typed here is the display name
   * of the device, so it is set before the sensors exist. The tariff is only offered with several contracts.
   */
  _renderDeviceSetup(ro) {
    const ids = this._draft.device_ids || [];
    if (!ids.length) return "";
    const prices = this._int?.tariffy?.prices;
    const withTariff = Array.isArray(prices) && prices.length >= 2;
    const names = this._draft.device_names || {};
    const chosen = this._draft.device_tariffs || {};
    const rows = ids
      .map((id) => {
        const friendly = this._autoName(id);
        const select = withTariff
          ? `<select data-devtariff="${esc(id)}" ${ro ? "disabled" : ""}>${[
            `<option value="">${esc(this._t("tariffDefault", { name: prices[0].name }))}</option>`,
            ...prices.map((p) => `<option value="${esc(p.entity)}"${chosen[id] === p.entity ? " selected" : ""}>${esc(p.name)}</option>`),
          ].join("")}</select>`
          : "";
        // the name of the device list (the display name, else the name of the sensor), editable; the sensor id below it
        return `<div class="trow dsetup"><input type="text" data-devname="${esc(id)}" value="${esc(names[id] || friendly)}" placeholder="${esc(friendly)}" maxlength="80" autocomplete="off" ${ro ? "disabled" : ""} aria-label="${esc(this._t("deviceNameLabel"))}"><span class="tn mi" title="${esc(id)}">${esc(id)}</span>${select}</div>`;
      })
      .join("");
    return `<div class="fld span"><label>${esc(this._t("f_device_setup"))}</label>${rows}<div class="hint">${esc(this._t("h_device_setup"))}</div></div>`;
  }

  _renderMatches(ro) {
    const { found, counts } = this._matchList();
    if (!found.length) return `<div class="hint">${esc(this._t("noMatches"))}</div>`;
    const seg = (group, value, key, tipKey) => {
      const on = (group === "state" ? this._fState || "all" : this._fSel || "all") === value;
      return `<button type="button" class="seg${on ? " on" : ""}" data-seg="${group}:${value}"${tipKey ? ` title="${esc(this._t(tipKey))}"` : ""}>${esc(this._t(key))} <small>${counts[value]}</small></button>`;
    };
    const excluded = new Set(this._draft.device_exclude);
    const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
    const x = found.filter((id) => excluded.has(id) || byPattern(id)).length;
    return `<div class="hint" id="mcount">${esc(this._t("matchesCount", { n: found.length, x }))}</div>
      <div class="mbar"><input type="text" data-filter value="${esc(this._filter || "")}" placeholder="${esc(this._t("filterMatches"))}" autocomplete="off" style="flex:1 1 160px;width:auto">
      ${ro ? "" : `<button class="btn ghost" data-bulk="exclude">${esc(this._t("excludeShown"))}</button><button class="btn ghost" data-bulk="include">${esc(this._t("includeShown"))}</button>`}</div>
      <div class="segs"><span class="seglab">${esc(this._t("filterGroupState"))}</span>${seg("state", "all", "filterAll")}${seg("state", "active", "filterActive", "filterActiveTip")}${seg("state", "idle", "filterIdle", "filterIdleTip")}<span class="sep"></span><span class="seglab">${esc(this._t("filterGroupSel"))}</span>${seg("sel", "all", "filterAll")}${seg("sel", "included", "filterIncluded")}${seg("sel", "excluded", "filterExcluded")}</div>
      <div class="mlist" id="mlist">${this._renderMatchRows(ro)}</div>`;
  }

  /**
   * The list of sources: every sensor Energy Assistant takes from Tariffy, EV Assistant, PV Assistant and Amortix,
   * grouped by integration (and contract, vehicle or entry), with the current value. A ticked sensor is used;
   * unticking puts it on the list `source_exclude` (applied when saved). The backend always lists all of them.
   */
  _renderSources(ro) {
    const list = Array.isArray(this._int?.sources) ? this._int.sources : [];
    if (!list.length) return `<div class="fld span note">${esc(this._t("srcNone"))}</div>`;
    const off = new Set(this._draft.source_exclude || []);
    const row = (src) => {
      const state = this._hass?.states?.[src.entity_id];
      const unit = state?.attributes?.unit_of_measurement || "";
      const value = state ? `${state.state}${unit ? ` ${unit}` : ""}` : "–";
      const used = !off.has(src.entity_id);
      return `<label class="srow${used ? "" : " off"}" title="${esc(src.entity_id)}"><input type="checkbox" data-source="${esc(src.entity_id)}" ${used ? "checked" : ""} ${ro ? "disabled" : ""}>
        <span class="sname">${esc(this._t(`src_${src.key}`))}<small>${esc(src.entity_id)}</small></span>
        <span class="sval">${esc(value)}</span><span class="sstate">${esc(this._t(used ? "srcUsed" : "srcOff"))}</span></label>`;
    };
    const blocks = ["tariffy", "ev_assistant", "pv_assistant", "amortix"].map((integration) => {
      const mine = list.filter((x) => x.integration === integration);
      if (!mine.length) return "";
      const groups = [...new Set(mine.map((x) => x.group))];
      const body = groups.map((g) => `${g ? `<div class="sgroup">${esc(g)}</div>` : ""}${mine.filter((x) => x.group === g).map(row).join("")}`).join("");
      return `<div class="sblock"><div class="shead">${esc(this._t(`srcInt_${integration}`))}<small>${esc(this._t(`srcUse_${integration}`))}</small></div>${body}</div>`;
    }).join("");
    return `<div class="fld span srcs">${blocks}</div>`;
  }

  _renderSettings() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const ro = !this._isAdmin;
    const states = this._hass?.states || {};
    const nameOf = (id) => this._settingsName(id);
    const options = this._candidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const energyOptions = this._energyCandidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const socOptions = this._socCandidates().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    const field = ([key, kind]) => {
      if (kind === "energyoffer") return this._renderEnergyOffer(ro);
      if (kind === "note") return `<div class="fld span note">${esc(this._t(key))}</div>`;
      if (kind === "labeltariffs") return this._renderGroupTariffs("label", ro);
      if (kind === "areatariffs") return this._renderGroupTariffs("area", ro);
      if (kind === "devnote") return `<div class="fld span note">${esc(this._deviceCounter())}</div>`;
      if (kind === "devsetup") return this._renderDeviceSetup(ro);
      if (kind === "history") return this._renderHistory(ro);
      if (kind === "sources") return this._renderSources(ro);
      const label = this._t(`f_${key}`);
      if (kind === "number") {
        const v = this._draft[key];
        return `<div class="fld"><label>${esc(label)}</label><input type="number" min="0" step="any" inputmode="decimal" data-num="${key}" value="${v == null ? "" : esc(String(v))}" ${ro ? "disabled" : ""}></div>`;
      }
      if (kind === "bool") {
        return `<label class="sw"><input type="checkbox" data-bool="${key}" ${this._draft[key] ? "checked" : ""} ${ro ? "disabled" : ""}>${esc(label)}</label>`;
      }
      const chips = this._draftList(key)
        .map((id) => `<span class="chip" title="${esc(id)}">${esc(nameOf(id))}${ro ? "" : `<button data-remove="${key}" data-id="${esc(id)}" aria-label="${esc(this._t("remove"))}">×</button>`}</span>`)
        .join("");
      if (kind === "areas") return `<div class="fld span"><label>${esc(label)}</label>${this._renderPicker("area", ro)}${this._draft.area_ids.length ? "" : `<div class="hint">${esc(this._t("areaAutoHint"))}</div>`}</div>`;
      if (kind === "labels") return `<div class="fld span"><label>${esc(label)}</label>${this._renderLabelPicker(ro)}</div>`;
      if (kind === "matches") {
        if (!this._draft.device_patterns.length) return "";
        const { found } = this._matchList();
        const open = this._open?.has("settings:matches");
        const byPattern = compilePatterns(this._draft.device_exclude_patterns || []);
        const off = new Set(this._draft.device_exclude);
        const x = found.filter((id) => off.has(id) || byPattern(id)).length;
        const head = `<button type="button" class="mtoggle" data-open="settings:matches" aria-expanded="${open ? "true" : "false"}"><span class="chev${open ? " on" : ""}" aria-hidden="true">▶</span>${esc(this._t("matchesSummary", { n: found.length, x }))}<span class="go">${esc(this._t(open ? "matchesHide" : "matchesShow"))}</span></button>`;
        return `<div class="fld span">${head}${open ? this._renderMatches(ro) : ""}</div>`;
      }
      const err = this._fieldError?.[key] ? `<div class="ferr">${esc(this._fieldError[key])}</div>` : "";
      const long = key === "device_exclude" || key === "device_ids"; // can be a long list: full width, scrolls when very long
      const input = ro ? "" : `<input type="text" data-add="${key}" data-mode="${kind}" ${kind === "text" ? "" : kind === "emulti" ? 'list="eb-energy"' : (kind === "soc" || kind === "socs") ? 'list="eb-soc"' : 'list="eb-sensors"'} placeholder="${esc(this._t(kind === "text" ? (key === "device_exclude_patterns" ? "addExcludePattern" : "addPattern") : "addSensor"))}" autocomplete="off">`;
      // The chips and the input share one box, so a list only grows as much as it has entries.
      return `<div class="fld${long ? " span" : ""}"><label>${esc(label)}</label>
        <div class="tags${long ? " cap" : ""}">${chips}${input}</div>${err}</div>`;
    };
    const sections = SETTINGS_SECTIONS.map(
      (sec) => `<div class="eb-card sec${["sectionDevices", "sectionAreas", "sectionLabels", "sectionSources"].includes(sec.title) ? " wide" : ""}${sec.title === "sectionDevices" ? " devsec" : ""}"><div class="eb-title">${this._t(sec.title)}</div><div class="fields">${sec.fields.map(field).join("")}</div></div>`,
    ).join("");
    const dirty = this._isDirty();
    let msg = "";
    if (ro) msg = `<span class="msg err">${this._t("adminOnly")}</span>`;
    else if (!this._hasSource()) msg = `<span class="msg err">${this._t("noSource")}</span>`;
    else if (this._status === "saving") msg = `<span class="msg">${this._t("saving")}</span>`;
    else if (this._status === "saved") msg = `<span class="msg">${this._t("saved")}</span>`;
    else if (this._status === "error") msg = `<span class="msg err">${esc(this._t("saveFailed", { error: this._error }))}</span>`;
    return `<datalist id="eb-sensors">${options}</datalist><datalist id="eb-energy">${energyOptions}</datalist><datalist id="eb-soc">${socOptions}</datalist>
      <div class="set">${this._renderIntegrations(ro)}<div class="grid">${sections}</div>
      ${ro ? `<div class="bar2">${msg}</div>` : `<div class="bar2">
        <button class="btn" data-save ${this._saveDisabled() ? "disabled" : ""}>${this._t("save")}</button>
        <button class="btn ghost" data-discard ${dirty ? "" : "disabled"}>${this._t("discard")}</button>${msg}</div>`}</div>`;
  }

  /** An icon button (ha-icon in Home Assistant, a character in the tests and without it). */
  _iconBtn(attr, value, icon, fallback, title) {
    const glyph = globalThis.customElements?.get?.("ha-icon") ? `<ha-icon icon="${icon}"></ha-icon>` : fallback;
    return `<button type="button" class="ibtn" ${attr}="${esc(value)}" title="${esc(title)}" aria-label="${esc(title)}">${glyph}</button>`;
  }

  /** Manual yearly values: the entered rows (edit and delete) and a row to add one (admins only). */
  _renderHistory(ro) {
    const lang = this._hass?.language || "en";
    const hist = this._draft.history_years || {};
    const num = (v) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
    const kindName = (kind) => this._t(HISTORY_KINDS.find(([k]) => k === kind)[2]);
    const rows = Object.entries(hist).flatMap(([year, kinds]) => HISTORY_KINDS.filter(([k]) => kinds[k]).map(([kind]) => {
      const e = kinds[kind], id = `${year}:${kind}`;
      const buttons = ro ? "" : `${this._iconBtn("data-histedit", id, "mdi:pencil", "✎", this._t("histEdit"))}${this._iconBtn("data-histrm", id, "mdi:delete-outline", "×", this._t("remove"))}`;
      return `<tr${this._histForm?.id === id ? ' class="on"' : ""}><td>${esc(year)}</td><td>${esc(kindName(kind))}</td><td>${num(e.kwh)} kWh</td><td>${e.cost != null ? esc(num(e.cost)) : "–"}</td><td class="acts">${buttons}</td></tr>`;
    })).join("");
    const table = rows ? `<table class="histtab"><tr><th>${esc(this._t("histYear"))}</th><th>${esc(this._t("histKind"))}</th><th>${esc(this._t("histKwh"))}</th><th>${esc(this._t("histCost"))}</th><th></th></tr>${rows}</table>` : "";
    const f = this._histForm || {};
    const editing = !!f.id;
    const options = HISTORY_KINDS.map(([k, , label]) => `<option value="${k}"${(f.kind || "house") === k ? " selected" : ""}>${esc(this._t(label))}</option>`).join("");
    const val = (v) => (v == null ? "" : ` value="${esc(String(v))}"`);
    const add = ro ? "" : `<div class="histadd"><input type="number" inputmode="numeric" min="1990" step="1" data-hnew="year" placeholder="${esc(this._t("histYear"))}"${val(f.year)}><select data-hnew="kind" aria-label="${esc(this._t("histKind"))}">${options}</select><input type="number" inputmode="decimal" min="0" step="any" data-hnew="kwh" placeholder="${esc(this._t("histKwh"))}"${val(f.kwh)}><input type="number" inputmode="decimal" min="0" step="any" data-hnew="cost" placeholder="${esc(this._t("histCost"))}"${val(f.cost)}><button type="button" class="btn ghost" data-histadd>${esc(this._t(editing ? "histApply" : "histAdd"))}</button>${editing ? `<button type="button" class="btn ghost" data-histcancel>${esc(this._t("histCancel"))}</button>` : ""}</div>`;
    const err = this._fieldError?.history_years ? `<div class="ferr">${esc(this._fieldError.history_years)}</div>` : "";
    return `<div class="fld span"><label>${esc(this._t("f_history_years"))}</label>${table}${add}${err}<div class="hint">${esc(this._t("histHint"))}</div></div>`;
  }

  /** Adds (or replaces) the year and kind of the entry row in the draft; shows a hint when the input is not usable. */
  _addHistory() {
    const get = (k) => this.shadowRoot.querySelector(`[data-hnew="${k}"]`)?.value ?? "";
    const year = parseInt(get("year"), 10), kwh = parseFloat(String(get("kwh")).replace(",", "."));
    const kind = HISTORY_KINDS.some(([k]) => k === get("kind")) ? get("kind") : "house";
    const costText = String(get("cost")).replace(",", ".").trim();
    const thisYear = tzParts(Date.now(), this._tz()).y;
    const entry = { kwh, ...(costText ? { cost: parseFloat(costText) } : {}) };
    const clean = cleanHistory({ [year]: { [kind]: entry } }, thisYear);
    if (!Object.keys(clean).length) {
      this._histForm = { ...(this._histForm || {}), year: get("year"), kind, kwh: get("kwh"), cost: get("cost") };
      this._fieldError = { history_years: this._t("histInvalid") };
      this._settingsDirty = true;
      this._render();
      return;
    }
    // Editing may change the year or the kind: the row that was edited is replaced, not kept.
    const hist = JSON.parse(JSON.stringify(this._draft.history_years || {}));
    if (this._histForm?.id) {
      const [oy, ok] = this._histForm.id.split(":");
      if (hist[oy]) { delete hist[oy][ok]; if (!Object.keys(hist[oy]).length) delete hist[oy]; }
    }
    for (const [y, kinds] of Object.entries(clean)) hist[y] = { ...(hist[y] || {}), ...kinds };
    this._draft.history_years = cleanHistory(hist);
    this._histForm = null;
    this._edited();
    // Saved at once, so there is no need to scroll down to the Save button (it saves the whole form, like the button).
    if (!this._saveDisabled()) this._save();
  }

  /** The offer of the Energy dashboard in the energy section: hint, question and the button (admins only). */
  _renderEnergyOffer(ro) {
    const offer = this._energyOffer?.targets;
    const hint = `<div class="hint">${esc(this._t("energyHint"))}</div>`;
    if (!offer || !Object.keys(offer).length) return `<div class="fld span">${hint}</div>`;
    const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const done = Object.entries(offer).every(([k, v]) => same(v, this._draftList(k)));
    return `<div class="fld span">${hint}<p class="pvq">${esc(done ? this._t("energyDone") : this._t("energyAsk"))}</p>
      ${done || ro ? "" : `<div class="bar2"><button type="button" class="btn" data-energyapply>${esc(this._t("energyApply"))}</button><span class="hint">${esc(this._t("energyOverwrite"))}</span></div>`}</div>`;
  }

  /**
   * Notice at the top of the settings: which sibling integrations were found (PV Assistant, Tariffy,
   * EV Assistant, Amortix) and what Energy Assistant uses from them. For PV Assistant it also asks
   * whether to take over its sensors. Empty if none was found.
   */
  _renderIntegrations(ro) {
    const found = this._int || {};
    const others = [];
    if (found.pv_assistant) others.push(this._t("intPvData"));
    if (found.tariffy) others.push(this._t("intTariffy"));
    const vehicles = found.ev_assistant?.vehicles;
    if (Array.isArray(vehicles) && vehicles.length) others.push(this._t("intEv", { n: vehicles.map((v) => v.name).join(", ") }));
    if (Array.isArray(found.amortix?.entries) && found.amortix.entries.length) others.push(this._t("intAmortix"));
    const pvPart = this._pv ? this._renderPvOffer(ro) : "";
    if (!pvPart && !others.length) return "";
    return `<div class="eb-card pvnote"><div class="eb-title">${esc(this._t("intTitle"))}</div>${pvPart}
      ${others.length ? `<ul class="ints">${others.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</div>`;
  }

  /** The PV Assistant part of the notice: the question, what would be taken over and the button. */
  _renderPvOffer(ro) {
    const t = this._pv.targets;
    const n = (key) => (t[key] || []).length;
    const parts = [];
    if (n("battery_power")) parts.push(this._t("pvCombined", { n: n("battery_power") }));
    if (n("battery_charge")) parts.push(this._t("pvCharge", { n: n("battery_charge") }));
    if (n("battery_discharge")) parts.push(this._t("pvDischarge", { n: n("battery_discharge") }));
    const gridParts = [];
    if (n("grid_import")) gridParts.push(this._t("pvImport", { n: n("grid_import") }));
    if (n("grid_export")) gridParts.push(this._t("pvExport", { n: n("grid_export") }));
    if (n("grid_power")) gridParts.push(this._t("pvCombined", { n: n("grid_power") }));
    const lines = [
      n("solar_power") ? this._t("pvSolar", { n: n("solar_power") }) : "",
      parts.length ? this._t("pvStorage", { parts: parts.join(", ") }) : "",
      gridParts.length ? this._t("pvGrid", { parts: gridParts.join(", ") }) : "",
      n("battery_soc") ? this._t("pvSoc", { cap: typeof t.battery_capacity === "number" ? `, ${t.battery_capacity.toLocaleString(this._hass?.language || "en")} kWh` : "" }) : "",
    ].filter(Boolean);
    const done = this._pvApplied();
    return `<p class="pvq">${esc(done ? this._t("pvDone") : this._t("pvAsk"))}</p>
      <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      ${this._pv.notes.feed_in_negative ? `<div class="hint">${esc(this._t("pvFeedInfo"))}</div>` : ""}
      ${this._pv.notes.storage_absolute ? `<div class="hint">${esc(this._t("pvAbsInfo"))}</div>` : ""}
      ${done || ro ? "" : `<div class="bar2"><button type="button" class="btn" data-pvapply>${esc(this._t("pvApply"))}</button><span class="hint">${esc(this._t("pvOverwrite"))}</span></div>`}`;
  }

  /** Translate a key using the Home Assistant UI language (de, otherwise en). */
  _t(key, vars = {}) {
    const lang = (this._hass?.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
    const text = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }

  /** Power of an entity in W (positive values expected). */
  _watts(entityId) {
    const s = entityId && this._hass?.states?.[entityId];
    if (!s || ["unavailable", "unknown"].includes(s.state)) return null;
    const v = parseFloat(s.state);
    return Number.isNaN(v) ? null : v * this._unitFactor(entityId);
  }
  _unitFactor(entityId) {
    const u = this._hass?.states?.[entityId]?.attributes?.unit_of_measurement;
    return u === "kW" ? 1000 : u === "MW" ? 1e6 : 1;
  }
  /** Sum of several sensors; null if none is configured or available. */
  _sum(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  /** Sum that ignores negative readings of single sensors (production, import and export cannot be negative). */
  _sumPos(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + Math.max(0, b), 0) : null;
  }

  /** Sum of the magnitudes: separate charging/discharging sensors may report their direction as negative values. */
  _sumAbs(ids) {
    const vals = (ids || []).map((id) => this._watts(id)).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + Math.abs(b), 0) : null;
  }

  /** Sum with optional sign inversion (for combined sensors). */
  _signed(ids, invert) {
    const v = this._sum(ids);
    return v == null ? null : invert ? -v : v;
  }

  /** Merge separate and combined sensors into positive quantities. */
  _split({ solar, gridIn, gridOut, discharge, charge, gridCharge, grid, battery }) {
    // Separate sensors win over the combined one: a combined meter often shows the same flow again, adding
    // both would count it twice. The combined sensor only fills in what no separate sensor covers.
    const pick = (separate, combined) => (separate != null ? separate : combined);
    const pos = (v) => (v == null ? null : Math.max(0, v));
    const neg = (v) => (v == null ? null : Math.max(0, -v));
    return {
      solar,
      gridIn: pick(gridIn, pos(grid)),
      gridOut: pick(gridOut, neg(grid)),
      discharge: pick(discharge, pos(battery)),
      charge: pick(charge, neg(battery)),
      gridCharge,
    };
  }

  /** Aktuelle Werte in W: house, solar, gridIn, gridOut, discharge, charge. */
  _current() {
    const c = this._cfg;
    const parts = this._split({
      solar: this._sumPos(c.solar_power),
      gridIn: this._sumPos(c.grid_import),
      gridOut: this._sumPos(c.grid_export),
      discharge: this._sumAbs(c.battery_discharge),
      charge: this._sumAbs(c.battery_charge),
      gridCharge: this._sum(c.battery_grid_charge),
      grid: this._signed(c.grid_power, c.invert_grid),
      battery: this._signed(c.battery_power, c.invert_battery),
    });
    const house = c.house_power ? this._watts(c.house_power) : this._calcHouse(parts);
    // Self-sufficiency right now: the share of the consumption that does not come from the grid.
    const autarky = house != null && house > 0 && parts.gridIn != null ? Math.max(0, Math.min(100, ((house - parts.gridIn) / house) * 100)) : null;
    return { house, direct: this._calcDirect(parts, house), autarky, ...parts };
  }
  /** Individual devices with their current power in W, highest first. */
  /** Display name of a sensor in the lists: the own name if one is set, else the friendly name. */
  _deviceName(id, names = this._cfg.device_names) {
    return names?.[id] || this._autoName(id);
  }

  /**
   * The name of a device when nobody named it: the name of its sensor without the word Leistung. It is the one
   * name used everywhere (lists, cards, tables, the names of the sensors a device gets) unless a display name is set.
   */
  _autoName(id) {
    const friendly = this._hass?.states?.[id]?.attributes?.friendly_name;
    return stripPower(friendly || id.split(".").pop().replace(/_/g, " "));
  }

  /** The same name while the settings are edited: the unsaved display names of the draft count. */
  _settingsName(id) {
    return this._deviceName(id, this._draft?.device_names);
  }

  /** The sensors of the device list: the single ones plus the ones the name patterns find. */
  _deviceIds() {
    const explicit = [...(this._cfg.device_power || []), ...(this._cfg.device_standby || [])];
    return [...new Set([...explicit, ...this._discoverDevices(this._cfg.device_patterns, this._cfg)])];
  }

  _devices() {
    const ids = this._deviceIds();
    const sensors = ids
      .map((id) => ({
        id,
        name: this._deviceName(id),
        original: this._autoName(id),
        w: this._watts(id),
      }))
      .filter((d) => d.w != null);
    return [...sensors, ...this._evRows(ids)].sort((a, b) => b.w - a.w);
  }

  /**
   * The wallbox of EV Assistant as a row of the device list (read only): its charging power is usually the
   * biggest single consumer and is not a sensor of the list. Left out when the wallbox sensor is already a
   * device or was excluded on purpose, so nothing is counted twice or against the wish of the user.
   */
  _evRows(deviceIds = []) {
    const vehicles = this._int?.ev_assistant?.vehicles;
    if (!Array.isArray(vehicles)) return [];
    const excluded = this._excluder(this._cfg);
    const rows = [];
    for (const v of vehicles) {
      if (v.wallbox_off || (v.wallbox_power && (deviceIds.includes(v.wallbox_power) || excluded(v.wallbox_power)))) continue;
      const attrs = this._hass?.states?.[v.live]?.attributes || {};
      const live = attrs.evcc_live || attrs.home_generic_live;
      const kw = Number(live?.charge_power);
      if (!live || live.charge_power == null || !Number.isFinite(kw)) continue;
      const solar = Number(live.session_solar_pct ?? attrs.solaranteil_pct);
      const charging = kw * 1000 >= IDLE_W;
      rows.push({
        name: `${this._t("evWallbox")} · ${v.name}`,
        icon: "mdi:ev-station",
        w: Math.max(0, kw * 1000),
        tip: charging && (live.session_solar_pct != null || attrs.solaranteil_pct != null) && Number.isFinite(solar) ? `${this._t("evSolar")} ${Math.round(solar)} %` : "",
      });
    }
    return rows;
  }

  /**
   * Power sensors whose name matches one of the patterns. Only "sensor." entities with
   * device_class power count. Sensors of the energy balance and excluded sensors are left out.
   */
  _discoverDevices(patterns = [], cfg = this._cfg, { ignoreExclude = false } = {}) {
    if (!patterns?.length) return [];
    const excluded = this._excluder(cfg, ignoreExclude);
    const matches = compilePatterns(patterns);
    return this._powerSensors()
      .filter((id) => !excluded(id) && matches(id))
      .sort();
  }

  /** All `sensor` entities with device_class power. */
  _powerSensors() {
    return Object.entries(this._hass?.states || {})
      .filter(([id, st]) => id.startsWith("sensor.") && st.attributes?.device_class === "power")
      .map(([id]) => id);
  }

  /**
   * Predicate for sensors that never count as device, area or label member: the sensors of the
   * energy balance (grid, solar, storage, house) and, unless ignored, the exclude list and patterns.
   */
  _excluder(cfg, ignoreExclude = false) {
    const skip = new Set([
      ...SYSTEM_KEYS.flatMap((k) => (Array.isArray(cfg[k]) ? cfg[k] : cfg[k] ? [cfg[k]] : [])),
      ...(ignoreExclude ? [] : cfg.device_exclude || []),
    ]);
    const byPattern = ignoreExclude ? () => false : compilePatterns(cfg.device_exclude_patterns || []);
    return (id) => skip.has(id) || byPattern(id);
  }

  _calcHouse({ solar, gridIn, gridOut, discharge, charge }) {
    if (gridIn == null) return null;
    return Math.max(0, (solar ?? 0) + gridIn + (discharge ?? 0) - (gridOut ?? 0) - (charge ?? 0));
  }

  /**
   * Solar power used directly: production minus export minus the solar share of storage charging,
   * limited to [0, min(production, house power)]. Without a grid-charge sensor the storage
   * is assumed to be charged entirely from solar.
   */
  _calcDirect({ solar, gridOut, charge, gridCharge }, house) {
    if (solar == null) return null;
    // Only the solar share of the charging counts; grid charging is subtracted.
    const pvCharge = Math.max(0, (charge ?? 0) - (gridCharge ?? 0));
    const d = solar - (gridOut ?? 0) - pvCharge;
    return Math.max(0, Math.min(d, solar, house ?? solar));
  }

  async _maybeLoadHistory() {
    const now = Date.now();
    if (!this._hass || !this._ready || this._loading || now - this._lastHistory < 5 * 60 * 1000) return;
    const c = this._cfg;
    const ids = [c.house_power, ...(c.solar_power || []), ...(c.grid_import || []), ...(c.grid_export || []),
      ...(c.battery_discharge || []), ...(c.battery_charge || []),
      ...(c.battery_grid_charge || []), ...(c.grid_power || []), ...(c.battery_power || [])].filter(Boolean);
    if (!ids.length) return;
    this._loading = true;
    try {
      const end = new Date();
      const start = new Date(end.getTime() - HISTORY_HOURS * 3600 * 1000);
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: ids,
        include_start_time_state: true,
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
      this._history = this._buildSeries(res, start.getTime(), end.getTime());
      this._lastHistory = now;
    } catch (e) {
      console.warn("Energy Assistant: could not load history", e);
      this._history = [];
      this._lastHistory = now - 4 * 60 * 1000; // retry after one minute
    } finally {
      this._loading = false;
      this._render();
    }
  }

  /** Map time series onto fixed time buckets and calculate house power. */
  _buildSeries(res, t0, t1) {
    const step = BUCKET_MIN * 60 * 1000;
    const n = Math.floor((t1 - t0) / step);
    const c = this._cfg;
    const sample = (id) => {
      const rows = res?.[id];
      if (!rows) return null;
      const f = this._unitFactor(id);
      const pts = rows
        .map((r) => ({ t: (r.lu ?? r.lc ?? 0) * 1000, v: parseFloat(r.s) }))
        .filter((p) => !Number.isNaN(p.v));
      let i = 0, last = null;
      const out = [];
      for (let k = 0; k <= n; k++) {
        const t = t0 + k * step;
        while (i < pts.length && pts[i].t <= t) last = pts[i++].v;
        out.push(last == null ? null : last * f);
      }
      return out;
    };
    // Add up several sensors per category (null if there is no value at that time).
    // mode: "abs" counts the magnitude of every sensor, "pos" ignores negative readings.
    const group = (ids, invert = false, mode = "") => {
      const list = (ids || []).map(sample).filter(Boolean);
      if (!list.length) return null;
      return Array.from({ length: n + 1 }, (_, k) => {
        const v = list.map((l) => l[k]).filter((x) => x != null).map((x) => (mode === "abs" ? Math.abs(x) : mode === "pos" ? Math.max(0, x) : x));
        return v.length ? (invert ? -1 : 1) * v.reduce((a, b) => a + b, 0) : null;
      });
    };
    const house = c.house_power ? sample(c.house_power) : null;
    const g = {
      solar: group(c.solar_power, false, "pos"), gridIn: group(c.grid_import, false, "pos"), gridOut: group(c.grid_export, false, "pos"),
      discharge: group(c.battery_discharge, false, "abs"), charge: group(c.battery_charge, false, "abs"),
      gridCharge: group(c.battery_grid_charge),
      grid: group(c.grid_power, c.invert_grid), battery: group(c.battery_power, c.invert_battery),
    };
    // The single production sensors, for the split in the tooltip.
    const solarIds = c.solar_power || [];
    const solarSamples = solarIds.map((id) => sample(id));
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const parts = this._split(Object.fromEntries(Object.entries(g).map(([key, arr]) => [key, arr ? arr[k] : null])));
      const v = house ? house[k] : this._calcHouse(parts);
      const net = parts.discharge == null && parts.charge == null ? null : (parts.discharge ?? 0) - (parts.charge ?? 0);
      pts.push({
        t: t0 + k * step, v, d: v == null ? null : this._calcDirect(parts, v),
        solar: parts.solar, gridOut: parts.gridOut, gridIn: parts.gridIn, net,
        discharge: parts.discharge, charge: parts.charge, gridCharge: parts.gridCharge, measured: !!house,
        sp: solarSamples.map((arr) => (arr ? Math.max(0, arr[k] ?? 0) : null)),
      });
    }
    pts.meta = { solarNames: solarIds.map((id) => this._deviceName(id)) };
    return pts;
  }

  /**
   * The series of the history chart, in the order and with the colors of the power chart of PV Assistant
   * (but computed from our own sensors, PV Assistant is not needed): production, feed-in, storage (from +,
   * to −), solar used directly, grid import and the house consumption. A series without any value is left out.
   */
  _historySeries(points) {
    const has = (key) => points.some((p) => p[key] != null);
    const pts = (key) => points.filter((p) => p[key] != null).map((p) => [p.t, p[key]]);
    const list = [];
    if (has("solar")) list.push({ key: "prod", name: this._t("hProd"), short: this._t("hProd"), color: "--ea-prod", points: pts("solar") });
    if (has("gridOut")) list.push({ key: "feed", name: this._t("hFeed"), short: this._t("hFeed"), color: "--ea-feed", points: pts("gridOut") });
    if (has("net")) {
      list.push({
        key: "net", name: this._t("hStorage"), short: this._t("hStorage"), tipName: this._t("hStorageNet"), color: "--ea-bout", colorNeg: "--ea-bin",
        legendItems: [{ name: this._t("hFromStorage"), color: "--ea-bout" }, { name: this._t("hToStorage"), color: "--ea-bin" }],
        points: pts("net"),
      });
    }
    if (has("d")) list.push({ key: "direct", name: this._t("hDirect"), short: this._t("hDirectShort"), color: "--ea-direct", points: pts("d") });
    if (has("gridIn")) list.push({ key: "grid", name: this._t("hGrid"), short: this._t("hGridShort"), color: "--ea-grid", points: pts("gridIn") });
    if (has("v")) list.push({ key: "house", name: this._t("hHouse"), short: this._t("hHouseShort"), color: "--ea-house", points: pts("v") });
    return list;
  }

  /** Round axis values: 0, 5,000, 10,000 ... (also with negative values for the storage charging). */
  _niceTicks(min, max, count = 4) {
    if (!(max > min)) max = min + 1;
    const raw = (max - min) / count;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const f = raw / pow;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  /**
   * The history chart of the last 24 hours: lines per series, the production as a light area, a legend,
   * direct labels at the line ends (on wide charts), a tooltip with all values (wired after the redraw, see
   * _wireChart) and the same data as an hourly table. The model of the drawing is kept in this._hv.
   */
  _historyChart(points) {
    const series = this._historySeries(points);
    const withData = points.filter((p) => p.v != null || p.solar != null);
    if (series.length === 0 || withData.length < 2) {
      this._hv = null;
      return `<div class="empty">${this._t("noHistory")}</div>`;
    }
    const lang = this._hass?.language || "en";
    const W = Math.max(280, Math.round(this._chartW || 900)), H = 280;
    const M = { l: 52, r: 8, t: 10, b: 24 };
    const labelW = W > 520 ? 84 : 0;
    const pw = W - M.l - M.r - labelW, ph = H - M.t - M.b;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const step = Math.max(1, points[1].t - points[0].t);
    const values = series.flatMap((s) => s.points.map((p) => p[1]));
    const ticks = this._niceTicks(Math.min(0, ...values), Math.max(0, ...values));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const x = (t) => M.l + ((t - t0) / (t1 - t0)) * pw;
    const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ph;
    const f1 = (n) => n.toFixed(1);
    let svg = "";
    for (const v of ticks) {
      svg += `<line x1="${M.l}" x2="${M.l + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}" class="${v === 0 ? "haxis" : "hgrid"}"/>`;
      svg += `<text class="htick" x="${M.l - 6}" y="${f1(y(v) + 4)}" text-anchor="end">${Math.round(v).toLocaleString(lang)}</text>`;
    }
    // time axis: full hours, every 3 hours (every 6 on a narrow chart)
    const hours = pw < 420 ? 6 : 3;
    const tz = this._tz();
    const first = tzParts(t0, tz);
    let tick = zonedTime(first.y, first.m - 1, first.d, first.h, tz); // the start of the local hour
    while (tick < t0 || tzParts(tick, tz).h % hours !== 0) tick += 3600000;
    for (; tick <= t1; tick += hours * 3600000) {
      svg += `<text class="htick" x="${f1(x(tick))}" y="${H - 6}" text-anchor="middle">${new Date(tick).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: tz })}</text>`;
    }
    let clip = "";
    series.forEach((s, i) => {
      // the line breaks where data is missing for more than 1.5 buckets
      const segs = [];
      let cur = [];
      s.points.forEach((p, k) => {
        if (k && p[0] - s.points[k - 1][0] > step * 1.5) { segs.push(cur); cur = []; }
        cur.push(p);
      });
      segs.push(cur);
      for (const seg of segs) {
        const path = seg.map((p, k) => `${k ? "L" : "M"}${f1(x(p[0]))},${f1(y(p[1]))}`).join("");
        if (i === 0 && seg.length > 1) {
          svg += `<path d="${path}L${f1(x(seg[seg.length - 1][0]))},${f1(y(0))}L${f1(x(seg[0][0]))},${f1(y(0))}Z" fill="var(${s.color})" opacity=".12"/>`;
        }
        if (s.colorNeg) {
          // the same line twice, clipped above and below the zero line (from storage / to storage)
          clip = `<defs><clipPath id="ea-clip-p"><rect x="0" y="0" width="${W}" height="${f1(y(0))}"/></clipPath><clipPath id="ea-clip-n"><rect x="0" y="${f1(y(0))}" width="${W}" height="${f1(H - y(0))}"/></clipPath></defs>`;
          svg += `<path d="${path}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round" clip-path="url(#ea-clip-p)"/>`;
          svg += `<path d="${path}" fill="none" stroke="var(${s.colorNeg})" stroke-width="2" stroke-linejoin="round" clip-path="url(#ea-clip-n)"/>`;
        } else {
          svg += `<path d="${path}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round"/>`;
        }
      }
    });
    if (labelW) {
      const ends = series.map((s) => ({ s, y: y(s.points[s.points.length - 1][1]) })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
      const over = ends[ends.length - 1].y - (M.t + ph + 8); // keep the labels inside the chart
      if (over > 0) ends.forEach((e) => { e.y -= over; });
      for (const e of ends) svg += `<text class="hend" x="${f1(M.l + pw + 6)}" y="${f1(e.y + 4)}">${esc(e.s.short)}</text>`;
    }
    svg += `<line class="hair" y1="${M.t}" y2="${M.t + ph}" visibility="hidden"/>`;
    svg += series.map((s) => `<circle class="hdot" r="4" fill="var(${s.color})" visibility="hidden"/>`).join("");
    svg += `<rect class="hit" x="${M.l}" y="${M.t}" width="${pw}" height="${ph}" fill="transparent"/>`;
    const legend = series.flatMap((s) => s.legendItems || [s])
      .map((s) => `<span><i style="background:var(${s.color})"></i>${esc(s.name)}</span>`).join("");
    // table: hourly means
    const byHour = new Map();
    series.forEach((s, i) => s.points.forEach(([ts, v]) => {
      const hp = tzParts(ts, tz);
      const h = zonedTime(hp.y, hp.m - 1, hp.d, hp.h, tz); // the start of the local hour
      const e = byHour.get(h) || series.map(() => [0, 0]);
      e[i][0] += v;
      e[i][1] += 1;
      byHour.set(h, e);
    }));
    const fmtTime = (ts) => new Date(ts).toLocaleString(lang, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });
    const rows = [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([h, e]) =>
      `<tr><th>${esc(fmtTime(h))}</th>${e.map(([sum, n]) => `<td>${n ? Math.round(sum / n).toLocaleString(lang) : "–"}</td>`).join("")}</tr>`).join("");
    const times = [...new Set(series.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b);
    this._hv = { W, H, M, pw, ph, t0, t1, lo, hi, series, lang, fmtTime, labelW, times, maps: series.map((s) => new Map(s.points)), byTs: new Map(points.map((p) => [p.t, p])), solarNames: points.meta?.solarNames || [], x, y };
    return `<div class="hchart"><div class="legend">${legend}</div>
      <div class="chartwrap" data-line><svg class="hsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(this._t("chartLabel"))}">${clip}${svg}</svg><div class="tip" hidden></div></div>
      <details class="tableview"${this._tableOpen ? " open" : ""}><summary>${esc(this._t("hTable"))}</summary>
        <table><tr><th>${esc(this._t("hTime"))}</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr>${rows}</table></details></div>`;
  }

  _renderHouse() {
    if (!this._ready) return `<div class="eb-card"><div class="empty">${this._t("loading")}</div></div>`;
    const cur = this._current();
    if (!this._cfg.house_power && !(this._cfg.grid_import || []).length && !(this._cfg.grid_power || []).length) {
      return `<div class="eb-card"><div class="empty">${this._t("notConfigured")}</div></div>`;
    }
    const limit = this._collapsedLimit();
    const areas = this._renderAreas(cur.house, limit);
    const labels = this._renderLabels(cur.house, limit);
    const devices = this._renderDevices(cur.house, limit);
    // Devices, areas and labels share one row, in this order. Missing cards leave more room for the others.
    const lists = `${devices}${areas}${labels}`;
    const hist = this._history ? this._historyChart(this._history) : `<div class="empty">${this._t("historyLoading")}</div>`;
    return `<div class="grid">
      ${this._renderAlerts()}
      ${this._renderLiveResults(cur)}
      <div class="eb-card fullrow">
        <div class="row"><span class="eb-title">${this._t("history")}</span><span class="eb-label">24 h</span></div>
        ${hist}
      </div>
      ${lists ? `<div class="trio">${lists}</div>` : ""}</div>`;
  }

  /**
   * PV by plant (from PV Assistant): the plants (inverters with their strings) with their power, strongest
   * first, with their share of the PV power. Only shown when there are at least two plants.
   */
  _renderPvPlants() {
    const plants = (this._pv?.plants || [])
      .map((p) => ({ name: p.name, w: this._sum(p.sensors) }))
      .filter((p) => p.w != null)
      .sort((a, b) => b.w - a.w);
    if (plants.length < 2) return "";
    const total = plants.reduce((a, p) => a + Math.max(0, p.w), 0);
    const scale = Math.max(1, ...plants.map((p) => p.w));
    const [tv, tu] = fmtPower(total);
    const rows = plants.map((p) => {
      const [v, u] = fmtPower(p.w);
      const share = total > 0 ? `<small class="pct">${Math.round((Math.max(0, p.w) / total) * 100)} %</small>` : "";
      return `<div class="dev"><div class="line"><span class="name"><span class="nt" title="${esc(p.name)}">${esc(p.name)}</span></span><span class="val">${v}<small>${u}</small>${share}</span></div>
        <div class="track"><div class="fill" style="width:${Math.min(100, (Math.max(0, p.w) / scale) * 100)}%"></div></div></div>`;
    }).join("");
    return `<div class="eb-card"><div class="row"><span class="eb-title">${esc(this._t("pvPlants"))}</span><span class="eb-label">${tv} ${tu}</span></div>
      <div class="devgrid">${rows}</div></div>`;
  }

  /** Card with the power of individual devices. Empty string if none are configured. */
  /**
   * Rows the lists show before they fold: as many as the shortest list has, so devices, areas and
   * labels end at about the same height. At least MIN_ROWS and at most MAX_ROWS. The rest can be
   * unfolded per list.
   */
  _collapsedLimit() {
    const counts = [];
    if ((this._cfg.device_power || []).length || (this._cfg.device_patterns || []).length || this._evRows().length) {
      counts.push(this._devices().filter((d) => d.w >= IDLE_W).length);
    }
    const areas = this._areas();
    if (areas.length) counts.push(areas.filter((g) => g.w >= IDLE_W).length);
    const labels = this._labelGroups();
    if (labels.length) counts.push(labels.filter((g) => g.w >= IDLE_W).length);
    const smallest = counts.length ? Math.min(...counts) : MAX_ROWS;
    return Math.max(MIN_ROWS, Math.min(MAX_ROWS, smallest));
  }

  _renderDevices(house, limit = MAX_ROWS) {
    const configured = (this._cfg.device_power || []).length || (this._cfg.device_patterns || []).length;
    if (!configured && !this._evRows().length) return "";
    const all = this._devices();
    // Admins can rename the sensors right in the list (pencil next to the name).
    const byId = new Map((this._usage?.devices || []).map((u) => [u.id, u]));
    const active = all.filter((d) => d.w >= IDLE_W).map((d) => {
      const u = d.id ? byId.get(d.id) : null;
      const kwh = u?.kwh >= 0.005 ? u.kwh.toLocaleString(this._hass?.language || "en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      return { ...d, editable: this._isAdmin, spark: u?.spark, tip: [d.tip, kwh ? this._t("uTodayKwh", { kwh }) : ""].filter(Boolean).join("\n") || undefined };
    });
    const sum = all.reduce((a, d) => a + d.w, 0);
    const other = house != null && house - sum >= IDLE_W ? { name: this._t("otherDevices"), w: house - sum, other: true } : null;
    // The total in the header includes the unmeasured rest, so it equals the house power.
    return this._listCard({
      title: this._t("devices"), rows: active, idle: all.length - active.length, sum: sum + (other ? other.w : 0), other, house,
      expanded: this._devExpanded, toggle: "data-devtoggle", limit,
    });
  }

  /**
   * Home Assistant icon (mdi:...) in front of a name, tinted with the label color if there is one.
   * Without the <ha-icon> element (or a valid icon) the colored dot is used, else nothing.
   */
  _iconHtml(icon, color) {
    const safeColor = color && /^[a-z-]+$/.test(color) ? color : "";
    if (icon && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(icon) && globalThis.customElements?.get?.("ha-icon")) {
      const tint = safeColor ? ` style="color:var(--${safeColor}-color, var(--eb-muted))"` : "";
      return `<ha-icon class="ico" icon="${esc(icon)}"${tint}></ha-icon>`;
    }
    return safeColor ? `<i class="dot" style="background:var(--${safeColor}-color, var(--eb-green))"></i>` : "";
  }

  /** Area of an entity: its own area, otherwise the area of its device. null if none. */
  _areaOf(entityId) {
    const ent = this._hass?.entities?.[entityId];
    const areaId = ent?.area_id || (ent?.device_id && this._hass?.devices?.[ent.device_id]?.area_id);
    const area = areaId && this._hass?.areas?.[areaId];
    return areaId ? { id: areaId, name: area?.name || areaId, icon: area?.icon || null } : null;
  }

  /**
   * Power sensors in an area (own area or the area of the device). Like for the labels no name
   * pattern is needed. The sensors of the energy balance and excluded sensors do not count.
   */
  _areaMembers(areaId, cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    return this._powerSensors()
      .filter((id) => !excluded(id) && this._areaOf(id)?.id === areaId)
      .sort();
  }

  /** Power sensors without any area, for the "No area" row of the automatic view. */
  _noAreaMembers(cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    return this._powerSensors().filter((id) => !excluded(id) && !this._areaOf(id)).sort();
  }

  /**
   * Rows of the Areas card. With areas selected only those are shown (even without sensors, they
   * count as idle). Without a selection all areas that have power sensors are shown, plus "No area".
   * Empty if there is nothing to group (e.g. no sensor belongs to an area).
   */
  _areas() {
    const selected = this._cfg.area_ids || [];
    const known = this._hass?.areas || {};
    const group = (key, name, icon, ids, none = false) => {
      const members = ids.map((id) => ({ name: this._deviceName(id), w: this._watts(id) })).filter((m) => m.w != null);
      const n = members.length;
      return {
        name, icon, none, n, key: `area:${key}`, members,
        w: members.reduce((a, m) => a + m.w, 0),
        sub: this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }),
        tip: members.slice(0, 12).map((m) => `${m.name} ${fmtPower(m.w).join(" ")}`).join(", ") + (n > 12 ? " …" : ""),
      };
    };
    const areaGroup = (id) => group(id, known[id].name || id, known[id].icon || "mdi:texture-box", this._areaMembers(id));
    if (selected.length) return selected.filter((id) => known[id]).map(areaGroup);
    const groups = Object.keys(known).map(areaGroup).filter((g) => g.n > 0);
    // Without any area assigned the list would only repeat the device list.
    if (!groups.length) return [];
    const none = this._noAreaMembers();
    return none.length ? [...groups, group("none", this._t("noArea"), "mdi:help-circle-outline", none, true)] : groups;
  }

  _renderAreas(house, limit = MAX_ROWS) {
    const all = this._areas();
    if (!all.length) return "";
    const active = all.filter((g) => g.w >= IDLE_W);
    const sum = all.reduce((a, g) => a + g.w, 0);
    // Without a selection the card covers the whole house, so the rest is shown as well and the total
    // equals the house power. With a selection it is only a part of the house: no rest row.
    const everything = !(this._cfg.area_ids || []).length;
    const other = everything && house != null && house - sum >= IDLE_W ? { name: this._t("otherDevices"), w: house - sum, other: true } : null;
    return this._listCard({
      title: this._t("areas"), rows: active, idle: all.length - active.length, sum: sum + (other ? other.w : 0), other, house,
      expanded: this._areaExpanded, toggle: "data-areatoggle", limit,
    });
  }

  /**
   * Power sensors that carry a label. Like for the devices, the sensors of the energy balance and
   * excluded sensors do not count. Unlike the devices no name pattern is needed: the label decides.
   */
  _labelMembers(labelId, cfg = this._cfg) {
    const excluded = this._excluder(cfg);
    const power = new Set(this._powerSensors());
    return Object.entries(this._labelData?.entities || {})
      .filter(([id, labels]) => labels.includes(labelId) && power.has(id) && !excluded(id))
      .map(([id]) => id)
      .sort();
  }

  /** The selected labels, each with the summed power of its sensors. */
  _labelGroups() {
    const byId = Object.fromEntries((this._labelData?.labels || []).map((l) => [l.label_id, l]));
    return (this._cfg.label_ids || [])
      .filter((id) => byId[id])
      .map((id) => {
        const members = this._labelMembers(id).map((sid) => ({
          name: this._deviceName(sid),
          w: this._watts(sid),
        })).filter((m) => m.w != null);
        const n = members.length;
        return {
          name: byId[id].name,
          color: byId[id].color,
          icon: byId[id].icon || "mdi:label",
          w: members.reduce((a, m) => a + m.w, 0),
          n,
          key: `label:${id}`,
          members,
          sub: this._t(n === 1 ? "labelSensors1" : "labelSensorsN", { n }),
          tip: members.slice(0, 12).map((m) => `${m.name} ${fmtPower(m.w).join(" ")}`).join(", ") + (n > 12 ? " …" : ""),
        };
      });
  }

  _renderLabels(house, limit = MAX_ROWS) {
    const all = this._labelGroups();
    if (!all.length) return "";
    const active = all.filter((g) => g.w >= IDLE_W);
    const sum = all.reduce((a, g) => a + g.w, 0);
    return this._listCard({
      title: this._t("labels"), rows: active, idle: all.length - active.length, sum, other: null, house,
      expanded: this._labelExpanded, toggle: "data-labeltoggle", limit,
    });
  }

  /** Card with a ranked list of rows with value, share of the house power and a bar. */
  _listCard({ title, rows, idle, sum, other, house, expanded, toggle, limit = MAX_ROWS }) {
    // Strongest first (rows without a group such as "No area" go last). Only the top ones show by default.
    const active = [...rows].sort((a, b) => (a.none ? 1 : b.none ? -1 : b.w - a.w));
    const folded = active.length > limit;
    const shown = folded && !expanded ? active.slice(0, limit) : active;
    const list = other ? [...shown, other] : shown;
    const scale = Math.max(1, house ?? 0, ...list.map((d) => d.w));
    const [tv, tu] = fmtPower(sum);
    const html = list
      .map((d) => {
        const [v, u] = fmtPower(d.w);
        // Share of the house power, only known when the house power is known.
        const share = house > 0 ? Math.round((d.w / house) * 100) : null;
        const renamed = d.original && d.original !== d.name;
        const tip = [share != null ? this._t("share", { pct: share }) : "", d.tip || "", renamed ? this._t("originalName", { name: d.original }) : ""].filter(Boolean).join("\n");
        const editing = d.id && d.editable && this._editName === d.id;
        const pencil = globalThis.customElements?.get?.("ha-icon") ? `<ha-icon icon="mdi:pencil"></ha-icon>` : "✎";
        const nameHtml = editing
          ? `<input class="rename" type="text" data-rename-input="${esc(d.id)}" value="${esc(renamed ? d.name : "")}" placeholder="${esc(d.original)}" maxlength="80" aria-label="${esc(this._t("rename"))}">`
          : `<span class="nt">${esc(d.name)}</span>${d.sub ? ` <small class="cnt">${esc(d.sub)}</small>` : ""}${d.id && d.editable ? `<button type="button" class="edit" data-rename="${esc(d.id)}" title="${esc(this._t("rename"))}" aria-label="${esc(this._t("rename"))}">${pencil}</button>` : ""}`;
        const expandable = d.key && d.members?.length;
        const isOpen = expandable && this._open?.has(d.key);
        const chev = expandable ? `<span class="chev${isOpen ? " on" : ""}" aria-hidden="true">▶</span>` : "";
        const openAttr = expandable ? ` data-open="${esc(d.key)}" role="button" tabindex="0" aria-expanded="${isOpen ? "true" : "false"}"` : "";
        const subs = isOpen
          ? `<div class="subs">${[...d.members].sort((a, b) => b.w - a.w).map((m) => {
            const [mv, mu] = fmtPower(m.w);
            return `<div class="s${m.w < IDLE_W ? " idle" : ""}"><span class="sn" title="${esc(m.name)}">${esc(m.name)}</span><b>${mv} ${mu}</b></div>`;
          }).join("")}</div>`
          : "";
        return `<div class="dev"><div class="line${expandable ? " open" : ""}"${openAttr}><span class="name" title="${esc(tip)}">${chev}${this._iconHtml(d.icon, d.color)}${nameHtml}</span>
          <span class="val">${d.spark ? this._sparkline(d.spark) : ""}${v}<small>${u}</small>${share != null ? `<small class="pct">${share} %</small>` : ""}</span></div>
          <div class="track"><div class="fill${d.other ? " other" : ""}" style="width:${Math.min(100, (d.w / scale) * 100)}%"></div></div>${subs}</div>`;
      })
      .join("");
    return `<div class="eb-card">
      <div class="row"><span class="eb-title">${title}</span><span class="eb-label">${tv} ${tu}</span></div>
      <div class="devgrid${expanded ? " devlist" : ""}">${html || `<div class="empty">–</div>`}</div>
      ${folded ? `<button class="linkbtn" ${toggle}>${expanded ? this._t("showLess") : this._t("showAll", { n: active.length })}</button>` : ""}
      ${idle > 0 ? `<div class="note">${this._t("idleDevices", { n: idle })}</div>` : ""}
    </div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <link rel="stylesheet" href="${BASE}/energy-assistant-tokens.css">
        <div class="wrap">
          <div class="top">
            <div class="left"><button class="menu" aria-label="Menu" hidden>☰</button></div>
            <div class="tabs"><button class="tab active" data-tab="house">Power</button></div>
            <div class="right"><button class="gear" data-tab="settings" aria-label="Settings" title="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button></div>
          </div>
          <div id="content"></div></div>
        <div class="tip gtip" hidden></div>`;
      this._wireTips();
      this.shadowRoot.querySelector(".menu").addEventListener("click", () =>
        this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })));
      const content = this.shadowRoot.getElementById("content");
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => this._fitPicture()).observe(content);
      content.addEventListener("click", (e) => this._onClick(e));
      content.addEventListener("change", (e) => this._onChange(e));
      content.addEventListener("input", (e) => this._onInput(e));
      content.addEventListener("keydown", (e) => {
        const row = e.target.closest?.("[data-open]");
        if (row && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          row.click();
          return;
        }
        const input = e.target.closest?.("[data-rename-input]");
        if (!input) return;
        if (e.key === "Enter") {
          e.preventDefault();
          this._commitRename(input.dataset.renameInput, input.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          this._endRename();
        }
      });
      content.addEventListener("focusout", (e) => {
        const input = e.target.closest?.("[data-rename-input]");
        if (input) this._commitRename(input.dataset.renameInput, input.value);
      });
      this.shadowRoot.querySelector(".top").addEventListener("click", (e) => {
        let tab = e.target.closest("[data-tab]")?.dataset.tab;
        // The gear toggles: a second click on it leads back to the house tab.
        if (tab === "settings" && this._tab === "settings") tab = "house";
        if (tab && tab !== this._tab) {
          this._tab = tab;
          this._editName = null;
          this._html = null;
          this._settingsDirty = true;
          this._render();
          this._loadLabels();
          this._loadGroupEnergy();
        }
      });
      this._built = true;
    }
    this.shadowRoot.querySelector(".menu").hidden = !this._narrow;
    this.shadowRoot.querySelector(".menu").setAttribute("aria-label", this._t("menu"));
    // Tabs come and go with the integrations that were found; a tab that vanished leads back to Power.
    const tabs = this._tabs();
    if (this._tab === "balance") this._tab = "usage"; // the balance is part of the consumption tab
    if (this._tab !== "settings" && !tabs.includes(this._tab)) {
      this._tab = "house";
      this._html = null;
    }
    const bar = this.shadowRoot.querySelector(".tabs");
    const signature = `${this._hass?.language}|${tabs.join(",")}`;
    if (bar.dataset.sig !== signature) {
      bar.dataset.sig = signature;
      bar.innerHTML = tabs.map((tab) => `<button class="tab" data-tab="${tab}">${esc(this._tabLabel(tab))}</button>`).join("");
    }
    for (const tab of bar.querySelectorAll(".tab")) {
      tab.classList.toggle("active", tab.dataset.tab === this._tab);
    }
    this._centerActiveTab(bar);
    const gear = this.shadowRoot.querySelector(".gear");
    gear.setAttribute("aria-label", this._t("settings"));
    gear.setAttribute("title", this._t("settings"));
    gear.classList.toggle("active", this._tab === "settings");
    const content = this.shadowRoot.getElementById("content");
    if (this._tab === "settings") {
      // The settings form only redraws on its own edits, so typing is not interrupted
      // by live state updates from Home Assistant.
      if (this._settingsDirty) {
        this._settingsDirty = false;
        this._html = null;
        content.innerHTML = this._renderSettings();
      }
      return;
    }
    // While a name is being typed the page is not redrawn, live updates would wipe the text field.
    if (this._editName) return;
    // Only redraw when the content changes (avoids flicker).
    if ((this._tab === "usage" || (this._tab === "costs" && this._int?.tariffy)) && this._balEnabled()) this._maybeLoadBalance();
    if (this._tab === "usage" || this._tab === "costs") this._maybeLoadEvCost();
    if ((this._tab === "usage" || this._tab === "house") && this._usageEnabled()) this._maybeLoadUsage();
    if (this._tab === "usage" && this._usageEnabled()) this._maybeLoadUsageView();
    if (this._tab === "usage" && this._usageEnabled()) this._maybeLoadGroupUsage();
    if (this._tab === "devices") {
      this._maybeLoadDevices();
      if (this._balEnabled()) this._maybeLoadBalance();
    }
    if (this._tab === "house") { this._maybeLoadBaseRef(); this._maybeLoadDevRef(); if (this._balEnabled()) this._maybeLoadToday(); }
    const html = this._renderPage();
    if (html !== this._html) {
      this._html = html;
      this._swapMarkup(content, html);
      this._fitPicture();
      this._wireChart(content);
      this._wireBalance(content);
      this._wireDevChart(content);
    }
  }

  /**
   * What the tooltip shows at a time: the bucket nearest to `t` with the value of every series (the storage
   * says "from" or "to" depending on its sign). Null without a chart.
   */
  _tipAt(t) {
    const hv = this._hv;
    if (!hv || !hv.times.length) return null;
    let lo = 0, hi = hv.times.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (hv.times[m] < t) lo = m;
      else hi = m;
    }
    const ts = Math.abs(hv.times[lo] - t) <= Math.abs(hv.times[hi] - t) ? hv.times[lo] : hv.times[hi];
    const point = hv.byTs.get(ts) || {};
    const rows = hv.series.map((s, i) => {
      const v = hv.maps[i].get(ts);
      const color = s.colorNeg && v != null && v < 0 ? s.colorNeg : s.color;
      return { name: s.tipName || s.name, color, value: v ?? null, parts: v == null ? [] : this._tipParts(s.key, v, point, hv) };
    });
    return { ts, title: hv.fmtTime(ts), rows };
  }

  /**
   * The sources behind a value in the tooltip (only where there are at least two non-zero ones): the plants
   * of the production with their share, and what the directly used solar power is made of: the house
   * consumption minus grid import and storage if the house is measured, otherwise production minus feed-in
   * and charging.
   */
  _tipParts(key, value, p, hv) {
    let parts = [];
    if (key === "prod") {
      const sp = p.sp || [];
      parts = sp.map((w, i) => ({ name: hv.solarNames[i] ?? `#${i + 1}`, value: w, note: value > 0 && w != null ? `${Math.round((w / value) * 100)} %` : undefined }));
    } else if (key === "direct") {
      parts = p.measured
        ? [{ name: this._t("hHouse"), value: p.v }, { name: `− ${this._t("hGrid")}`, value: -(p.gridIn ?? 0) }, { name: `− ${this._t("hDischarge")}`, value: -(p.discharge ?? 0) }]
        : [{ name: this._t("hProd"), value: p.solar }, { name: `− ${this._t("hFeed")}`, value: -(p.gridOut ?? 0) }, { name: `− ${this._t("hCharge")}`, value: -Math.max(0, (p.charge ?? 0) - (p.gridCharge ?? 0)) }];
    }
    parts = parts.filter((x) => x.value != null && x.value !== 0 && !Number.isNaN(x.value));
    return parts.length >= 2 || (key === "direct" && parts.length >= 1) ? parts : [];
  }

  /**
   * After every redraw of the page: tooltip and crosshair of the history chart, the open/closed state of the
   * table, and one redraw when the chart box has another width than the drawing (a viewBox in real pixels
   * keeps the text readable on a phone).
   */
  _wireChart(content) {
    const wrap = content.querySelector?.(".chartwrap[data-line]");
    const hv = this._hv;
    if (!wrap || !hv) return;
    const box = Math.max(280, Math.round(wrap.clientWidth || 0));
    if (wrap.clientWidth && Math.abs(box - hv.W) > 24) {
      this._chartW = box;
      this._html = null;
      this._render();
      return;
    }
    const svg = wrap.querySelector("svg"), tip = wrap.querySelector(".tip"), hit = svg.querySelector(".hit");
    const hair = svg.querySelector(".hair"), dots = [...svg.querySelectorAll(".hdot")];
    const hide = () => {
      this._hover = null;
      tip.hidden = true;
      hair.setAttribute("visibility", "hidden");
      dots.forEach((d) => d.setAttribute("visibility", "hidden"));
    };
    const show = (clientX, clientY) => {
      const r = svg.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width) * hv.W;
      const info = this._tipAt(hv.t0 + ((px - hv.M.l) / hv.pw) * (hv.t1 - hv.t0));
      if (!info) return;
      this._hover = { x: clientX, y: clientY };
      const cx = hv.x(info.ts);
      hair.setAttribute("x1", cx);
      hair.setAttribute("x2", cx);
      hair.setAttribute("visibility", "visible");
      info.rows.forEach((row, i) => {
        dots[i].setAttribute("visibility", row.value == null ? "hidden" : "visible");
        if (row.value != null) {
          dots[i].setAttribute("cx", cx);
          dots[i].setAttribute("cy", hv.y(row.value));
          dots[i].setAttribute("fill", `var(${row.color})`);
        }
      });
      tip.replaceChildren();
      const title = document.createElement("div");
      title.className = "tt";
      title.textContent = info.title;
      tip.append(title);
      for (const row of info.rows) {
        const line = document.createElement("div");
        line.className = "tr";
        const key = document.createElement("i");
        key.style.background = `var(${row.color})`;
        const val = document.createElement("b");
        val.textContent = row.value == null ? "–" : `${Math.round(row.value).toLocaleString(hv.lang)} W`;
        const name = document.createElement("span");
        name.textContent = row.name;
        line.append(key, val, name);
        tip.append(line);
        for (const part of row.parts || []) {
          const sub = document.createElement("div");
          sub.className = "ts";
          const pv = document.createElement("span");
          pv.textContent = `${Math.round(part.value).toLocaleString(hv.lang)} W`;
          const pn = document.createElement("span");
          pn.textContent = part.name;
          sub.append(pv, pn);
          if (part.note) {
            const note = document.createElement("b");
            note.textContent = part.note;
            sub.append(note);
          }
          tip.append(sub);
        }
      }
      tip.hidden = false;
      const left = (cx / hv.W) * r.width + 14;
      tip.style.left = `${Math.max(0, left + tip.offsetWidth > wrap.clientWidth ? left - tip.offsetWidth - 28 : left)}px`;
      tip.style.top = `${Math.max(0, Math.min(clientY - r.top - tip.offsetHeight / 2, wrap.clientHeight - tip.offsetHeight))}px`;
    };
    hit.addEventListener("pointermove", (e) => show(e.clientX, e.clientY));
    hit.addEventListener("pointerleave", hide);
    // The page is redrawn with every new value; a pointer that rests on the chart keeps its tooltip.
    if (this._hover) {
      const { x, y } = this._hover;
      requestAnimationFrame(() => { if (hit.matches(":hover")) show(x, y); else this._hover = null; });
    }
    const details = content.querySelector("details.tableview");
    if (details) details.addEventListener("toggle", () => { this._tableOpen = details.open; });
  }

  /**
   * One tooltip for the whole panel, in the style of the history chart: every element with a `title` (it is
   * taken over, so the plain browser tooltip does not show as well), `data-tip` (text, one line per row) or
   * `data-tipj` (a title and rows with a color dot, a bold value and a name, as JSON) gets it on hover.
   */
  _wireTips() {
    const root = this.shadowRoot;
    const tip = root.querySelector(".gtip");
    let current = null;
    const hide = () => { current = null; tip.hidden = true; };
    const fill = (el) => {
      if (el.hasAttribute("title")) { // keep the text, drop the native tooltip
        el.dataset.tip = el.getAttribute("title");
        el.removeAttribute("title");
      }
      tip.replaceChildren();
      if (el.dataset.tipj) {
        let data;
        try { data = JSON.parse(el.dataset.tipj); } catch (e) { return false; }
        const title = document.createElement("div");
        title.className = "tt";
        title.textContent = data.t || "";
        tip.append(title);
        for (const [color, value, name] of data.r || []) {
          const line = document.createElement("div");
          line.className = "tr";
          const key = document.createElement("i");
          key.style.background = String(color).startsWith("--") ? `var(${color})` : color; // a variable name or a color
          const val = document.createElement("b");
          val.textContent = value;
          const label = document.createElement("span");
          label.textContent = name;
          line.append(key, val, label);
          tip.append(line);
        }
        return true;
      }
      const text = el.dataset.tip;
      if (!text) return false;
      for (const part of text.split("\n")) {
        const line = document.createElement("div");
        line.className = "tp";
        line.textContent = part;
        tip.append(line);
      }
      return true;
    };
    const place = (x, y) => {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const vw = globalThis.innerWidth || Infinity, vh = globalThis.innerHeight || Infinity;
      const left = x + 16 + w > vw ? x - w - 16 : x + 16;
      const top = y + 18 + h > vh ? y - h - 12 : y + 18;
      tip.style.left = `${Math.max(4, left)}px`;
      tip.style.top = `${Math.max(4, top)}px`;
    };
    root.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const el = e.target.closest?.("[data-tipj],[data-tip],[title]");
      if (!el) { hide(); return; }
      if (el !== current) {
        if (!fill(el)) { hide(); return; }
        current = el;
      }
      tip.hidden = false;
      place(e.clientX, e.clientY);
    });
    root.addEventListener("pointerleave", hide);
    root.addEventListener("pointerdown", hide);
  }

  /**
   * Replace the markup of the page. Home Assistant sends new values all the time, so this happens
   * often. The scroll position of the expanded lists is kept, otherwise they jump back to the top.
   */
  /**
   * The picture beside the card *Right now* is taller than the card and grows above it (the sun or the moon stands
   * there). Make room for that above the card so nothing is cut off at the top of the page: the space above is as
   * high as the picture reaches over the card, measured after the layout and again when the size changes.
   */
  _fitPicture() {
    const heroes = this.shadowRoot?.querySelectorAll?.(".reshero");
    if (!heroes) return;
    for (const hero of heroes) {
      const svg = hero.querySelector(".resillu svg");
      if (!svg) continue;
      const pad = parseFloat(hero.style.paddingTop) || 0;
      const over = hero.getBoundingClientRect().top + pad - svg.getBoundingClientRect().top;
      const want = over > 0 ? Math.ceil(over) + 4 : 0;
      if (Math.abs(want - pad) >= 1) hero.style.paddingTop = want ? `${want}px` : "";
    }
  }

  _swapMarkup(content, html) {
    // Keyed by the title of the card, so the positions stay with their list when lists come and go.
    const key = (el) => el.closest(".eb-card")?.querySelector(".eb-title")?.textContent;
    const tops = new Map([...content.querySelectorAll(".devlist")].map((el) => [key(el), el.scrollTop]));
    content.innerHTML = html;
    for (const el of content.querySelectorAll(".devlist")) {
      const top = tops.get(key(el));
      if (top) el.scrollTop = top;
    }
  }
}

// The time helpers are reachable for the tests.
EnergyAssistantPanel.tzParts = tzParts;
EnergyAssistantPanel.zonedTime = zonedTime;

customElements.define("energy-assistant-panel", EnergyAssistantPanel);
