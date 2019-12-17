# kintone-mapsearch-plugin  

kintone-mapsearch-pluginは、登録データの地図範囲検索ができるkintoneのプラグインです。  

<br>

## 使用方法  

![kintone-mapsearch-plugin](./img/img_01.gif)

<br>

kintoneにプラグイン登録  
```
./dist/plugin.zip  
```
![画像](./img/img_02.png)

<br>

CSVでアプリ新規追加  
必須フィールド: name, lon, lat  
すべてフィールド名 = フィールドコードに置き換え  
```
./data/sample.csv  
```
![画像](./img/img_03.png)
![画像](./img/img_04.png)

<br>

アプリにプラグイン適用  
![画像](./img/img_05.png)

<br>
<br>

## 開発方法

- node v13.1.0  
- npm v6.13.0  

<br>

インストール  
```bash
npm install
```

<br>

デプロイ  
```bash
npm start
```

<br>
<br>

## ライセンス
MIT

Copyright (c) 2019 Yasunori Kirimoto

<br>
