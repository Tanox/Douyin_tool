---
version: 1.1
last_updated: 2024-04-16
author: Sut
changelog: "娣囶喗顒滄担婊嗏偓鍛繆閹垰鎷伴弴瀛樻煀閺冦儲婀?
---

# 闂勫嫬缍?
閺堫剟妾ぐ鏇熷絹娓氭饱ouyin Tool妞ゅ湱娲伴惃鍕夐崗鍛扮カ閺傛瑥鎷伴崣鍌濃偓鍐т繆閹垬鈧?
## 閻╊喖缍?
- [閹垛偓閺堫垰寮懓鍍?#閹垛偓閺堫垰寮懓?
- [API閺傚洦銆俔(#api閺傚洦銆?
- [韫囶偅宓庨柨鐢?#韫囶偅宓庨柨?
- [闁板秶鐤嗙拠瀛樻](#闁板秶鐤嗙拠瀛樻)
- [鐢瓕顫嗛梻顕€顣絔(#鐢瓕顫嗛梻顕€顣?
- [閺堫垵顕㈢悰鈺?#閺堫垵顕㈢悰?
- [閻╃鍙х挧鍕爱](#閻╃鍙х挧鍕爱)
- [鐠佺褰茬拠涔?#鐠佺褰茬拠?

## 閹垛偓閺堫垰寮懓?
### 濞村繗顫嶉崳藡PI

- **localStorage** - 閻劋绨€涙ê鍋嶉悽銊﹀煕闁板秶鐤?- **MutationObserver** - 閻╂垵鎯塂OM閸欐ê瀵?- **DOM API** - 閻劋绨幙宥勭稊妞ょ敻娼伴崗鍐
- **CSSStyleSheet** - 閻劋绨崝銊︹偓浣锋叏閺€瑙勭壉瀵?
### JavaScript閻楄鈧?
- **ES6+** - 娴ｈ法鏁ら惃鍕箛娴狀枑avaScript閻楄鈧?  - 缁狀厼銇旈崙鑺ユ殶
  - 濡剝婢樼€涙顑佹稉?  - 鐟欙絾鐎挧瀣偓?  - Promise
  - 濡€虫健閸?
### CSS閻楄鈧?
- **CSS閸欐﹢鍣?* - 閻劋绨稉濠氼暯鐎圭偟骞?- **Flexbox/Grid** - 閻劋绨敮鍐ㄧ湰
- **婵帊缍嬮弻銉嚄** - 閻劋绨崫宥呯安瀵繗顔曠拋?- **CSS閸斻劎鏁?* - 閻劋绨幓鎰磳閻劍鍩涙担鎾荤崣

## API閺傚洦銆?
### 閺嶇绺続PI

#### 闁板秶鐤嗙粻锛勬倞

```javascript
// 閸旂姾娴囬柊宥囩枂
config.load();

// 娣囨繂鐡ㄩ柊宥囩枂
config.save();

// 閼惧嘲褰囬柊宥囩枂妞?config.get(key, defaultValue);

// 鐠佸墽鐤嗛柊宥囩枂妞?config.set(key, value);

// 闁插秶鐤嗛柊宥囩枂
config.reset();
```

#### UI缁狅紕鎮?
```javascript
// 閸掓繂顫愰崠鏈
uiManager.init();

// 閸掑洦宕叉稉濠氼暯
uiManager.switchTheme(theme);

// 閹貉冨煑閸忓啰绀岄弰鍓с仛/闂呮劘妫?uiManager.toggleElement(elementId, visible);

// 鐠嬪啯鏆ｇ敮鍐ㄧ湰
uiManager.adjustLayout(layout);
```

## 韫囶偅宓庨柨?
娴犮儰绗呴弰顖氫紣閸忛攱鏁幐浣烘畱韫囶偅宓庨柨顕嗙窗

| 韫囶偅宓庨柨?| 閸旂喕鍏橀幓蹇氬牚 |
|-------|---------|
| `Ctrl+Shift+D` | 閸掑洦宕叉稉濠氼暯 |
| `Ctrl+Shift+H` | 閺勫墽銇?闂呮劘妫岄柊宥囩枂闂堛垺婢?|
| `Ctrl+Shift+R` | 闁插秶鐤嗛幍鈧張澶庮啎缂?|

## 闁板秶鐤嗙拠瀛樻

閻劍鍩涢柊宥囩枂鐎涙ê鍋嶉崷銊︾セ鐟欏牆娅掗惃鍒瞣calStorage娑擃叏绱濋柨顔兼倳娑撶douyin_tool_config`閵嗗倿鍘ょ純顕€鍣伴悽鈫桽ON閺嶇厧绱￠敍灞煎瘜鐟曚礁瀵橀崥顐′簰娑撳鐡у▓纰夌窗

```json
{
  "theme": "default", // 娑撳顣介敍姝瀍fault 閹?dark
  "elements": {       // 閸忓啰绀岄弰鍓с仛閹貉冨煑
    "sidebar": true,
    "comments": true,
    "ads": false
  },
  "layout": "default", // 鐢啫鐪拋鍓х枂
  "showConfig": true   // 閺勵垰鎯侀弰鍓с仛闁板秶鐤嗛棃銏℃緲
}
```

## 鐢瓕顫嗛梻顕€顣?
### 1. 瀹搞儱鍙跨€瑰顥婇崥搴濈瑝閻㈢喐鏅ラ幀搴濈疄閸旂儑绱?
**鐟欙絽鍠呴弬瑙勵攳**閿?- 绾喕绻氬鍙夘劀绾喖鐣ㄧ憗鍛暏閹寸柉鍓奸張顒傤吀閻炲棗娅?- 绾喛顓婚懘姘拱瀹告彃鎯庨悽?- 閸掗攱鏌婇幎鏍叾缂冩垿銆?- 濡偓閺屻儲妲搁崥锔芥箒閸忔湹绮幍鈺佺潔閸愯尙鐛?
### 2. 婵″倷缍嶉幁銏狀槻姒涙顓荤拋鍓х枂閿?
**鐟欙絽鍠呴弬瑙勵攳**閿?- 閹垫挸绱戦柊宥囩枂闂堛垺婢?- 閻愮懓鍤?闁插秶鐤嗙拋鍓х枂"閹稿鎸?- 閹存牔濞囬悽銊ユ彥閹圭兘鏁?`Ctrl+Shift+R`

### 3. 瀹搞儱鍙块弨顖涘瘮閸濐亙绨哄ù蹇氼潔閸ｎ煉绱?
**閺€顖涘瘮閻ㄥ嫭绁荤憴鍫濇珤**閿?- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

### 4. 閹舵牠鐓剁純鎴︺€夐弴瀛樻煀閸氬骸浼愰崗铚傜瑝瀹搞儰缍旀禍鍡吹

**鐟欙絽鍠呴弬瑙勵攳**閿?- 濡偓閺屻儲妲搁崥锔芥箒瀹搞儱鍙块弴瀛樻煀
- 婵″倹鐏夊▽鈩冩箒閺囧瓨鏌婇敍灞藉讲娴犮儱婀狦itHub娑撳﹥褰佹禍顥痵sue

## 閺堫垵顕㈢悰?
| 閺堫垵顕?| 鐟欙綁鍣?|
|-----|------|
| 閻劍鍩涢懘姘拱 | 娑撯偓缁夊秴褰叉禒銉ユ躬濞村繗顫嶉崳銊よ厬鏉╂劘顢戦惃鍑vaScript閼存碍婀伴敍宀€鏁ゆ禍搴濇叏閺€鍦秹妞や絻顢戞稉鍝勬嫲閺嶅嘲绱?|
| Tampermonkey | 閺堚偓濞翠浇顢戦惃鍕暏閹寸柉鍓奸張顒傤吀閻炲棗娅掗敍灞炬暜閹镐竼hrome閵嗕笚irefox缁涘绁荤憴鍫濇珤 |
| DOM | 閺傚洦銆傜€电钖勫Ο鈥崇€烽敍宀€缍夋い鐢垫畱缂傛牜鈻奸幒銉ュ經 |
| CSS | 鐏炲倸褰旈弽宄扮础鐞涱煉绱濋悽銊ょ艾鐎规矮绠熺純鎴︺€夐惃鍕潒鐟欏鐗卞?|
| MutationObserver | 閻劋绨惄鎴炲付DOM閸欐ê瀵查惃鍕セ鐟欏牆娅扐PI |

## 閻╃鍙х挧鍕爱

### 瀵偓閸欐垵浼愰崗?
- [Tampermonkey](https://www.tampermonkey.net/) - 濞翠浇顢戦惃鍕暏閹寸柉鍓奸張顒傤吀閻炲棗娅?- [Violentmonkey](https://violentmonkey.github.io/) - 瀵偓濠ф劗鏁ら幋鐤壖閺堫剛顓搁悶鍡楁珤
- [Node.js](https://nodejs.org/) - JavaScript鏉╂劘顢戦悳顖氼暔

### 鐎涳缚绡勭挧鍕爱

- [MDN Web Docs](https://developer.mozilla.org/) - Web瀵偓閸欐垶鏋冨?- [JavaScript.info](https://javascript.info/) - JavaScript鐎涳缚绡勭純鎴犵彲
- [CSS-Tricks](https://css-tricks.com/) - CSS鐎涳缚绡勭挧鍕爱

### 閻劍鍩涢懘姘拱楠炲啿褰?
- [Greasy Fork](https://greasyfork.org/) - 閻劍鍩涢懘姘拱閸掑棔闊╅獮鍐插酱
- [OpenUserJS](https://openuserjs.org/) - 瀵偓濠ф劗鏁ら幋鐤壖閺堫剙閽╅崣?
## 鐠佺褰茬拠?
Douyin Tool 妞ゅ湱娲伴柌鍥╂暏 MIT 鐠佺褰茬拠浣碘偓鍌濐嚊閹懓顕崣鍌炴妞ゅ湱娲伴弽鍦窗瑜版洑绗呴惃?[LICENSE](https://github.com/sutchan/douyin_tool/blob/main/LICENSE) 閺傚洣娆㈤妴?
## 鐠愶紕灏為懓鍛瘹閸?
婵″倹鐏夐幃銊﹀厒娑撴椽銆嶉惄顔间粵閸戦缚纭€閻氼噯绱濈拠宄板棘閼?[瀵偓閸欐垶瀵氶崡姊?../06-瀵偓閸欐垶瀵氶崡?README.md) 閸?[鐠愶紕灏為幐鍥у础](../guides/contributing_guide.md)閵?
## 閺囧瓨鏌婇弮銉ョ箶

鐎瑰本鏆ｉ惃鍕纯閺傜増妫╄箛妤勵嚞閸欏倿妲?[CHANGELOG](../CHANGELOG.md) 閺傚洣娆㈤妴
