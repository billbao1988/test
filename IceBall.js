/**
 * Created by billbao on 2016/3/24.
 */


var IceBallSprite = cc.Sprite.extend({
    body: null,

    ctor: function(radius, ballColor){
        this._super();

        this.setContentSize(radius * 2, radius * 2);

        var draw = new cc.DrawNode();
        this.addChild(draw);

        draw.drawDot(cc.p(radius, radius), radius, ballColor);
    },

    bindBody: function(body){
        this.body = body;
    },

    getBody: function(){
        return this.body;
    },

    updatePosition: function(pos){
        this.setPosition(pos);
        if(this.body != null){
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2(pos.x / PTM_RATIO, pos.y / PTM_RATIO));
        }

    }
});

var IceBall = function(){
    this.ID = 0;
    this.status = -1;
    this.ballSize = 0;
    this.beRecycled = false;
    this.belonger = -1;
    this.ballSprite = null;
//    this.posX = -1;
//    this.posY = -1;

};

var IBRadius = [0, 45, 35, 25];

var IBSize = {};
IBSize.BIG = 1;
IBSize.MEDIUM = 2;
IBSize.SMALL = 3;

var IBStatus = {};
IBStatus.IN_HAND = 1;
IBStatus.IN_AREA = 2;
IBStatus.DEAD = 3;