jQuery.noConflict();

(function($, PLUGIN_ID) {
    'use strict';

    kintone.events.on('app.record.index.show', function() {
        // 全レコード取得
        let manager = new KintoneRecordManager;
        // アプリID
        manager.appId = kintone.app.getId();
        manager.getRecords(function(records) {
            // GeoJSON作成
            let geojson_all = {
                "type": "FeatureCollection",
                "features":[]
            };
            for (const value of records) {
                let geojson_obj = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [value.lon.value, value.lat.value]
                    },
                    "properties": {
                        "name": value.name.value,
                        "lat": value.lat.value,
                        "lon": value.lon.value
                    }
                };
                geojson_all["features"].push(geojson_obj);
            }

            // マップタグ作成
            let headerSpace = kintone.app.getHeaderSpaceElement();
            let mapSpace = document.createElement('div');
            mapSpace.id = 'map';
            headerSpace.appendChild(mapSpace);

            // マップ設定
            const map = new mapboxgl.Map({
                container: 'map',
                style: {
                    "version": 8,
                    "sources": {
                        "MIERUNEMAP": {
                            "type": "raster",
                            "tiles": ["https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png"],
                            "tileSize": 256,
                            "attribution": "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."
                        }
                    },
                    "layers": [{
                        "id": "MIERUNEMAP",
                        "type": "raster",
                        "source": "MIERUNEMAP",
                        "minzoom": 0,
                        "maxzoom": 18
                    }]
                },
                center: [139.767, 35.681],
                zoom: 11
            });


            map.on("load", function () {
                // ポイント表示
                map.addSource("FeaturesPoint", {
                    type: "geojson",
                    data: geojson_all
                });
                map.addLayer({
                    id: "FeaturesPoint",
                    type: "circle",
                    source: "FeaturesPoint",
                    layout: {},
                    paint: {
                        "circle-pitch-alignment": "map",
                        "circle-stroke-color": "#1253A4",
                        "circle-stroke-width": 2,
                        "circle-stroke-opacity": 0.8,
                        "circle-color": "#1253A4",
                        "circle-radius": 3,
                        "circle-opacity": 0.5
                    }
                });

                // クリックイベント
                map.on('click', function(e) {
                    // クリック座標取得
                    let coordinates = e.lngLat;

                    // サークルポリゴンの有無判断
                    if(typeof map.getLayer('RangePolygon') !== 'undefined') {
                        map.removeLayer('RangePolygon');
                        map.removeSource('RangePolygon');
                    }
                    // 選択ポイントの有無判断
                    if(typeof map.getLayer('SelectPoint') !== 'undefined') {
                        map.removeLayer('SelectPoint');
                        map.removeSource('SelectPoint');
                    }
                    
                    // サークルポリゴン作成
                    let options = {
                        steps: 100,
                        units: 'kilometers'
                    };
                    let range = turf.circle(
                        [coordinates.lng, coordinates.lat],
                        0.5,
                        options
                    );

                    // ポリゴン表示
                    map.addSource("RangePolygon", {
                        type: "geojson",
                        data: range
                    });
                    map.addLayer({
                        id: "RangePolygon",
                        type: "fill",
                        source: "RangePolygon",
                        layout: {},
                        paint: {
                            "fill-color": "#FCD1B5",
                            "fill-opacity": 0.6
                        }
                    });

                    // ポリゴン内にあるポイント抽出
                    let ptsWithin = turf.pointsWithinPolygon(geojson_all, range);

                    // 選択ポイント表示
                    map.addSource("SelectPoint", {
                        type: "geojson",
                        data: ptsWithin
                    });
                    map.addLayer({
                        id: "SelectPoint",
                        type: "circle",
                        source: "SelectPoint",
                        layout: {},
                        paint: {
                            "circle-pitch-alignment": "map",
                            "circle-stroke-color": "#FFD464",
                            "circle-stroke-width": 3,
                            "circle-stroke-opacity": 0.8,
                            "circle-color": "#FFD464",
                            "circle-radius": 4,
                            "circle-opacity": 0.8
                        }
                    });

                    // 検索リストの有無判断
                    if(document.getElementById('addList') !== null) {
                        document.getElementById('addList').textContent = null;
                    } else {
                        let addList = document.createElement('ul');
                        addList.id = 'addList';
                        document.getElementById('list').appendChild(addList);
                    }

                    // 検索件数表示
                    let length = document.createElement('p');
                    length.textContent =  '検索件数: ' +  ptsWithin.features.length + '件';
                    document.getElementById('addList').appendChild(length);

                    // 検索リスト表示
                    for (const value of ptsWithin.features) {
                        let nameList = document.createElement('li');
                        nameList.textContent =  value.properties.name;
                        document.getElementById('addList').appendChild(nameList);
                    }

                });
            });

            // ナビゲーションコントロール表示
            map.addControl(new mapboxgl.NavigationControl());

            // リストコントロール表示
            function ListControl() { }
            ListControl.prototype.onAdd = function(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'mapboxgl-ctrl';
                this._container.id = 'list';
                return this._container;
            };
            ListControl.prototype.onRemove = function () {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            };
            map.addControl(new ListControl(), 'top-left');

        });

    });


    /**
     * kintoneと通信を行うクラス
     */
    let KintoneRecordManager = (function() {
        KintoneRecordManager.prototype.records = [];    // 取得したレコード
        KintoneRecordManager.prototype.appId = null;    // アプリID
        KintoneRecordManager.prototype.query = '';      // 検索クエリ
        KintoneRecordManager.prototype.limit = 100;     // 一回あたりの最大取得件数
        KintoneRecordManager.prototype.offset = 0;      // オフセット

        function KintoneRecordManager() {
            this.appId = kintone.app.getId();
            this.records = [];
        }

        // すべてのレコード取得する
        KintoneRecordManager.prototype.getRecords = function(callback) {
            kintone.api(
                kintone.api.url('/k/v1/records', true),
                'GET',
                {
                    app: this.appId,
                    query: this.query + (' limit ' + this.limit + ' offset ' + this.offset)
                },
                (function(_this) {
                    return function(res) {
                        let len;
                        Array.prototype.push.apply(_this.records, res.records);
                        len = res.records.length;
                        _this.offset += len;
                        if (len < _this.limit) { // まだレコードがあるか？
                            _this.ready = true;
                            if (callback !== null) {
                                callback(_this.records); // レコード取得後のcallback
                            }
                        } else {
                            _this.getRecords(callback); // 自分自身をコール
                        }
                    };
                })(this)
            );
        };
        return KintoneRecordManager;
    })();

})(jQuery, kintone.$PLUGIN_ID);
