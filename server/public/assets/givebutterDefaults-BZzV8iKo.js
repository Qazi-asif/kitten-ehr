const s="MW5zW87vHahaqHQX",c="pQq5xn",E="p5MzyA",n="gV1nYk",g=`<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${s}"><\/script>
<givebutter-widget id="${c}"></givebutter-widget>`,T=`<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${s}"><\/script>
<givebutter-widget id="${n}"></givebutter-widget>`,_=`<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${s}"><\/script>
<givebutter-widget id="${E}"></givebutter-widget>`;function u(i){const t=i.match(/campaign=["']([^"']+)["']/i);if(t!=null&&t[1])return t[1];const e=i.match(/<givebutter-widget[^>]*\bid=["']([^"']+)["']/i);if(e!=null&&e[1])return e[1];const r=i.match(/[?&]p=([^&"'\s>]+)/i);return r!=null&&r[1]?r[1]:"other"}function a(i){const t=i==null?void 0:i.trim();if(!t)return g;if(/<givebutter-/i.test(t))return t;const e=u(t);return`${t}
<givebutter-giving-form campaign="${e}"></givebutter-giving-form>`}export{g as D,_ as a,T as b,a as e};
