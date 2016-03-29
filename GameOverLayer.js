/**
 * Created by billbao on 2016/3/29.
 */

var GameOverLayer = cc.Layer.extend({

    _config: {
        myScore: 0,
        oppScore: 0,
        replayCallback: null
    },

    ctor: function(){
        this._super();

        var bgLayer = new cc.LayerColor(cc.color.BACK);
        bgLayer.x = 0;
        bgLayer.y = 0;
        bgLayer.setOpacity(50);
        this.addChild(bgLayer, 0);

        this._init();
    },

    _init: function () {
        var winSize = cc.director.getWinSize();
        var label = new cc.LabelTTF("Game Over", "Arial", 50);
        label.setAnchorPoint(cc.p(0.5, 0.5));
        label.setPosition(cc.p(winSize.width / 2, winSize.height / 2 + 50));
        this.addChild(label);

        var menu = new cc.Menu();
        menu.setPosition(cc.p(0, 0));
        this.addChild(menu, 1);

        var againLabel = new cc.LabelTTF("再来一局", "Arial", 40);
        var menuItem = new cc.MenuItemLabel(againLabel, this.onMenuCallback, this);
        menuItem.x = winSize.width / 2;
        menuItem.y = winSize.height / 2 - 100;
        menu.addChild(menuItem);
    },

    onMenuCallback:function () {
        cc.log("onMenuCallBack");
        this._config && this._config.replayCallback && this._config.replayCallback();
        GameOverLayer.Close();
    },

    showResult: function(config){
        this._config = config;
    }
});

GameOverLayer.Show = function(config, container){
    var dialog = GameOverLayer.GetInstance();
    if(container != null){
        container.addChild(dialog, 2);
    }else{
        cc.director.getRunningScene().addChild(dialog, 2);
    }
    dialog.showResult(config);
};

GameOverLayer.GetInstance = function(){
    if(GameOverLayer._instance == null){
        GameOverLayer._instance = new GameOverLayer();
    }

    return GameOverLayer._instance;
};
GameOverLayer.Close = function(){
    GameOverLayer._instance.removeFromParent(true);
    GameOverLayer._instance = null;
};