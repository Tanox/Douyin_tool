-
version: 1.2
last_updated: 2024-06-19
author: Sut
changelog: "淇缂栫爜闂锛岄噸鍐欏紑鍙戞寚鍗桼EADME"
---

# 寮€鍙戞寚鍗?娆㈣繋闃呰鎶栭煶UI瀹氬埗鍣ㄥ紑鍙戞寚鍗楋紝鏈寚鍗楀皢甯姪鎮ㄤ簡瑙ｉ」鐩殑寮€鍙戞祦绋嬨€佺幆澧冮厤缃拰缂栫爜瑙勮寖銆?
## 寮€鍙戠幆澧冨噯澶?### 绯荤粺瑕佹眰
- Node.js (v14+)
- Git
- 鐜颁唬娴忚鍣紙鎺ㄨ崘Chrome锛?
### 鍏嬮殕椤圭洰
```bash
git clone https://github.com/sutchan/douyin_tool.git
cd douyin_tool
```

### 椤圭洰缁撴瀯
```
douyin_tool/
鈹溾攢鈹€ src/             # 婧愪唬鐮佺洰褰?鈹?  鈹溾攢鈹€ main.js      # 涓荤▼搴忓叆鍙?鈹?  鈹溾攢鈹€ config.js    # 閰嶇疆绠＄悊
鈹?  鈹溾攢鈹€ ui_manager.js # UI绠＄悊鍣?鈹?  鈹溾攢鈹€ styles/      # 鏍峰紡鏂囦欢鐩綍
鈹?  鈹斺攢鈹€ utils/       # 宸ュ叿鍑芥暟鐩綍
鈹溾攢鈹€ dist/            # 鏋勫缓杈撳嚭鐩綍
鈹溾攢鈹€ docs/            # 鏂囨。鐩綍
鈹溾攢鈹€ build.js         # 鏋勫缓鑴氭湰
鈹斺攢鈹€ package.json     # 椤圭洰渚濊禆閰嶇疆
```

## 寮€鍙戞祦绋?### 1. 瀹夎渚濊禆
椤圭洰浣跨敤npm绠＄悊渚濊禆锛屾墽琛屼互涓嬪懡浠ゅ畨瑁咃細
```bash
npm install
```

### 2. 鏋勫缓椤圭洰
鎵ц鏋勫缓鑴氭湰鐢熸垚鐢ㄦ埛鑴氭湰锛?
```bash
node build.js
```

鏋勫缓浜х墿灏嗙敓鎴愬湪 `dist` 鐩綍涓€?
### 3. 娴嬭瘯涓庤皟璇?
- 浣跨敤娴忚鍣ㄦ墿灞曪紙濡俆ampermonkey锛夊姞杞芥瀯寤哄悗鐨勮剼鏈?- 鍦ㄦ姈闊崇綉绔欎笂娴嬭瘯鍔熻兘
- 浣跨敤娴忚鍣ㄥ紑鍙戣€呭伐鍏疯繘琛岃皟璇?
## 缂栫爜瑙勮寖
### JavaScript缂栫爜瑙勮寖
- 浣跨敤ES6+璇硶
- 浣跨敤2涓┖鏍艰繘琛岀缉杩?- 璇彞缁撴潫浣跨敤鍒嗗彿
- 瀛楃涓蹭娇鐢ㄥ弻寮曞彿
- 鍙橀噺/鍑芥暟浣跨敤灏忛┘宄板懡鍚嶆硶
- 绫讳娇鐢ㄥぇ椹煎嘲鍛藉悕娉?- 甯搁噺浣跨敤鍏ㄥぇ鍐欏苟浣跨敤涓嬪垝绾垮垎闅?- 鎵€鏈夊嚱鏁板繀椤诲寘鍚獼SDoc娉ㄩ噴

### CSS缂栫爜瑙勮寖
- 浣跨敤BEM鍛藉悕瑙勮寖
- 閬靛惊CSS鍙橀噺绠＄悊涓婚
- 浣跨敤Flexbox鍜孏rid甯冨眬
- 閬垮厤浣跨敤!important
- 缁勪欢鏍峰紡妯″潡鍖?
## 鐗堟湰鎺у埗
### Git鎻愪氦瑙勮寖

鎻愪氦淇℃伅搴旈伒寰互涓嬫牸寮忥細

```
<type>: <description>

[optional body]

[optional footer]
```

鎻愪氦绫诲瀷鍖呮嫭锛?- `feat`: 娣诲姞鏂板姛鑳?- `fix`: 淇bug
- `docs`: 鏇存柊鏂囨。
- `style`: 浠ｇ爜鏍煎紡璋冩暣
- `refactor`: 浠ｇ爜閲嶆瀯
- `test`: 娣诲姞鎴栦慨鏀规祴璇?- `chore`: 鏋勫缓鎴栦緷璧栨洿鏂?
## 璐＄尞鎸囧崡

1. Fork椤圭洰浠撳簱
2. 鍒涘缓鐗规€у垎鏀細`git checkout -b feature/amazing-feature`
3. 鎻愪氦鏇存敼锛歚git commit -m 'feat: add some amazing feature'`
4. 鎺ㄩ€佸埌鍒嗘敮锛歚git push origin feature/amazing-feature`
5. 鎻愪氦Pull Request

## 鎬ц兘浼樺寲
### 寮€鍙戞敞鎰忎簨椤?- 閬垮厤浣跨敤`console.log`鍦ㄧ敓浜х幆澧?- 浣跨敤闃叉姈鍜岃妭娴佷紭鍖栦簨浠跺鐞?- 绂佺敤Source Map浠ュ噺灏戞枃浠跺ぇ灏?
### 鏋勫缓浼樺寲

- 浣跨敤UglifyJS鍘嬬缉浠ｇ爜
- 鍚堝苟鍜屽帇缂〤SS鏂囦欢
- 绉婚櫎鏈娇鐢ㄧ殑浠ｇ爜

## 鐗堟湰绠＄悊
椤圭洰浣跨敤璇箟鍖栫増鏈紙SemVer锛夎繘琛岀増鏈鐞嗭細
- 涓荤増鏈彿(Major)锛氫笉鍏煎鐨凙PI鍙樻洿
- 娆＄増鏈彿(Minor)锛氬悜涓嬪吋瀹圭殑鍔熻兘鎬ф柊澧?- 淇鍙?Patch)锛氬悜涓嬪吋瀹圭殑闂淇