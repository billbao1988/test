// box2d中1米对应的像素值
var PTM_RATIO = 32;

// box2d中常用类的简化标识
var b2Vec2 = Box2D.Common.Math.b2Vec2
    , b2BodyDef = Box2D.Dynamics.b2BodyDef
    , b2Body = Box2D.Dynamics.b2Body
    , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    , b2World = Box2D.Dynamics.b2World
    , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
    , b2EdgeShape = Box2D.Collision.Shapes.b2EdgeShape
    , b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    , b2ContactListener = Box2D.Dynamics.b2ContactListener;

var SType_Red = 1;      // 红方
var SType_Blue = 2;     // 蓝方

var ST_Red_BColor = cc.color(0xfd, 0x69, 0xb3);
var ST_Red_AColor = cc.color(0xfe, 0x96, 0xc9);

var ST_Blue_BColor = cc.color(0x20, 0xe5, 0xed);
var ST_Blue_AColor = cc.color(0x63, 0xed, 0xf0);

var TITLE_BAR_HEIGHT = 126;
var GAME_AREA_WIDTH = 720;
var GAME_AREA_HEIGHT = 1280 - TITLE_BAR_HEIGHT;
var WHITE_AREA_HEIGHT = 182;
var SCORE_AREA_HEIGHT = 395;

var MY_BALL_POINT = cc.p(GAME_AREA_WIDTH / 2, WHITE_AREA_HEIGHT / 2);
var OPP_BALL_POINT = cc.p(GAME_AREA_WIDTH / 2, GAME_AREA_HEIGHT - WHITE_AREA_HEIGHT / 2);
var MY_SCORE_AREA = cc.rect(0, GAME_AREA_HEIGHT / 2, GAME_AREA_WIDTH, SCORE_AREA_HEIGHT);
var OPP_SCORE_AREA = cc.rect(0, WHITE_AREA_HEIGHT, GAME_AREA_WIDTH, SCORE_AREA_HEIGHT);
var MY_RECYCLE_AREA = cc.rect(0, 0, GAME_AREA_WIDTH, WHITE_AREA_HEIGHT);
var OPP_RECYCLE_AREA = cc.rect(0, GAME_AREA_HEIGHT - WHITE_AREA_HEIGHT, GAME_AREA_WIDTH, WHITE_AREA_HEIGHT);

var MainLayer = cc.Layer.extend({

    gameLogic: null,

    world: null,

    myBColor: null,
    myAColor: null,
    opponentBColor: null,
    opponentAColor: null,

    myScoreLabel: null,
    opponentScoreLabel: null,

    touchListener: null,

    myBQDrawNode: null,
    oppBQDrawNode: null,

    ctor: function () {
        this._super();

        var bgLayer = new cc.LayerColor(cc.color.WHITE);
        bgLayer.x = 0;
        bgLayer.y = 0;
        this.addChild(bgLayer, 0);

        this._init();
    },

    _init: function () {
        this.gameLogic = new GameLogic(this);
        this.gameLogic.switchStageTo(GameStage.GAME_STAGE_INIT);

        this._initGamePara();
        this._drawTitleBar();
        this._drawGameArea();

        this._drawBallQueue();

        this.world = this._createWorld(new b2Vec2(0, 0), true);
        this._createWalls();

        this.schedule(this.sampling, 0.1);
        this.schedule(this.worldStep, 0.03);

        this.gameLogic.switchStageTo(GameStage.GAME_STAGE_BALL);

    },

    onEnter: function () {
        this._super();

        this.touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            onTouchBegan: function (touch, event) {
                cc.log("onTouchBegan");
                var target = event.getCurrentTarget();
                var point = touch.getLocation();

                return target.gameLogic.onTouchBegan(point);
            },
            onTouchMoved: function (touch, event) {
                cc.log("onTouchMoved");

                var target = event.getCurrentTarget();
                var point = touch.getLocation();

                target.gameLogic.onTouchMoved(point);

            },
            onTouchEnded: function (touch, event) {
                cc.log("onTouchEnded");
                var target = event.getCurrentTarget();
                var point = touch.getLocation();

                target.gameLogic.onTouchEnded(point);

            },
            onTouchCancelled: function (touch, event) {
                cc.log("onTouchCancelled");
                var target = event.getCurrentTarget();
                var point = touch.getLocation();

                target.gameLogic.onTouchCancelled(point);
            }
        });
        cc.eventManager.addListener(this.touchListener, this);
    },

    onExit: function () {
        this._super();

        cc.eventManager.removeListener(this.touchListener);
    },

    sampling: function(dt){
    //    cc.log("sampling dt:" + dt);
        this.gameLogic.touchSampling(dt);
    },

    _initGamePara: function(){

    },

    _drawTitleBar: function(){
        var winSize = cc.director.getWinSize();

        var draw = new cc.DrawNode();
        this.addChild(draw, 1);

        draw.drawRect(cc.p(0, winSize.height - TITLE_BAR_HEIGHT), cc.p(winSize.width, winSize.height), cc.color(0, 0, 255));

        var titleLabel = new cc.LabelTTF("球球碰撞", "Arial", 40);
        titleLabel.setAnchorPoint(cc.p(0.5, 0.5));
        titleLabel.setPosition(cc.p(winSize.width /2, winSize.height - TITLE_BAR_HEIGHT / 2));
        this.addChild(titleLabel, 5);
    },

    _drawGameArea: function () {
    //    var winSize = cc.director.getWinSize();

        var draw = new cc.DrawNode();
        this.addChild(draw, 1);

        if (this.gameLogic.mySType == SType_Red) {
            // 我方
            this.myBColor = ST_Red_BColor;
            this.myAColor = ST_Red_AColor;
            // 对方
            this.opponentBColor = ST_Blue_BColor;
            this.opponentAColor = ST_Blue_AColor;
        } else {
            // 我方
            this.myBColor = ST_Blue_BColor;
            this.myAColor = ST_Blue_AColor;
            // 对方
            this.opponentBColor = ST_Red_BColor;
            this.opponentAColor = ST_Red_AColor;
        }

        draw.drawRect(cc.p(0, WHITE_AREA_HEIGHT), cc.p(GAME_AREA_WIDTH, GAME_AREA_HEIGHT / 2 ), this.opponentAColor);
        draw.drawRect(cc.p(0, GAME_AREA_HEIGHT / 2 ), cc.p(GAME_AREA_WIDTH, GAME_AREA_HEIGHT - WHITE_AREA_HEIGHT), this.myAColor);


        this.myScoreLabel = new cc.LabelTTF("0", "Arial", 100);
        this.myScoreLabel.setColor(this.myBColor);
        this.myScoreLabel.setAnchorPoint(cc.p(1, 0.5));
        this.myScoreLabel.setPosition(cc.p(GAME_AREA_WIDTH - 50, WHITE_AREA_HEIGHT / 2));
        this.addChild(this.myScoreLabel, 5);

        this.opponentScoreLabel = new cc.LabelTTF("0", "Arial", 100);
        this.opponentScoreLabel.setColor(this.opponentBColor);
        this.opponentScoreLabel.setAnchorPoint(cc.p(1, 0.5));
        this.opponentScoreLabel.setPosition(cc.p(GAME_AREA_WIDTH - 50, GAME_AREA_HEIGHT - WHITE_AREA_HEIGHT / 2));
        this.addChild(this.opponentScoreLabel, 5);
    },

    _drawBallQueue: function(){
        this.myBQDrawNode = new cc.DrawNode();
        this.myBQDrawNode.setPosition(MY_BALL_POINT.x, MY_BALL_POINT.y - 75);
        this.addChild(this.myBQDrawNode, 3);

        this.oppBQDrawNode = new cc.DrawNode();
        this.oppBQDrawNode.setPosition(OPP_BALL_POINT.x, OPP_BALL_POINT.y + 75);
        this.addChild(this.oppBQDrawNode, 3);

        var myBQ = this.gameLogic.getBallQueueInHand(this.gameLogic.myBallQueue);
        var oppBQ = this.gameLogic.getBallQueueInHand(this.gameLogic.oppBallQueue);

        this.updateBallInHand(myBQ, oppBQ);
    },

    _createWorld: function (gravity, bSleep) {
        var world = new b2World(gravity, bSleep);
        world.SetContinuousPhysics(true);

        return world;
    },

    _createWalls: function () {
    //    var winSize = cc.director.getWinSize();

        var winWidth_M = GAME_AREA_WIDTH / PTM_RATIO;
        var winHeight_M = GAME_AREA_HEIGHT / PTM_RATIO;

        var fixDef = new b2FixtureDef();
        fixDef.density = 1.0;           // 密度
        fixDef.friction = 0.3;          // 摩擦系数（0.0到1.0之间）
        fixDef.restitution = 0.5;       // 弹性系数（0.0到1.0之间）

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;

        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(winWidth_M / 2, 0);
        // upper side
        bodyDef.position.Set(winWidth_M / 2, winHeight_M);
        this.world.CreateBody(bodyDef).CreateFixture(fixDef);
        // bottom side
        bodyDef.position.Set(winWidth_M / 2, 0);
        this.world.CreateBody(bodyDef).CreateFixture(fixDef);

        fixDef.shape.SetAsBox(0, winHeight_M / 2);
        // left side
        bodyDef.position.Set(0, winHeight_M / 2);
        this.world.CreateBody(bodyDef).CreateFixture(fixDef);
        // right side
        bodyDef.position.Set(winWidth_M, winHeight_M / 2);
        this.world.CreateBody(bodyDef).CreateFixture(fixDef);
    },

    newABall: function(size, p, sideType){
        var bColor = null;
        if(sideType == SType_Red){
            bColor = ST_Red_BColor;
        }else{
            bColor = ST_Blue_BColor;
        }
        var ballSprite = new IceBallSprite(IBRadius[size], bColor);
        ballSprite.setPosition(p);
        this.addChild(ballSprite, 2);

        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.position.Set(p.x / PTM_RATIO, p.y / PTM_RATIO);
        bodyDef.userData = ballSprite;
        var body = this.world.CreateBody(bodyDef);


        var dynamicBall = new b2CircleShape();
        dynamicBall.SetRadius(IBRadius[size] / PTM_RATIO);

        // Define the dynamic body fixture.
        var fixtureDef = new b2FixtureDef();
        fixtureDef.shape = dynamicBall;
        fixtureDef.density = 1.0;
        fixtureDef.friction = 0.3;
        body.CreateFixture(fixtureDef);
        body.SetLinearDamping(0.5);
        body.SetAngularDamping(0.5);

        ballSprite.bindBody(body);

        return ballSprite;
    },

    worldStep: function(dt){
        if(this.gameLogic.getCurStage() != GameStage.GAME_STAGE_GAME_OVER){
            var velocityIterations = 8;
            var positionIterations = 1;

            // Instruct the world to perform a single step of simulation. It is
            // generally best to keep the time step and iterations fixed.
            this.world.Step(0.03, velocityIterations, positionIterations);

            var isAllStop = true;
            var bodyNum = 0;
            //Iterate over the bodies in the physics world
            for (var b = this.world.GetBodyList(); b; b = b.GetNext()) {
                bodyNum ++;
                if (b.GetUserData() != null) {
                    //Synchronize the AtlasSprites position and rotation with the corresponding body
                    var myActor = b.GetUserData();
                    myActor.x = b.GetPosition().x * PTM_RATIO;
                    myActor.y = b.GetPosition().y * PTM_RATIO;
                    myActor.rotation = -1 * cc.radiansToDegrees(b.GetAngle());

                    var velocity = b.GetLinearVelocity();
                    //   cc.log("velocity x:" + velocity.x + ", y:" + velocity.y);
                    if(velocity.x != 0 || velocity.y != 0){
                        isAllStop = false;
                    }
                    if(Math.abs(velocity.x) < 0.2 && Math.abs(velocity.y) < 0.2){
                        b.SetLinearVelocity(new b2Vec2(0, 0));
                        b.SetAngularVelocity(0);
                    }
                    /*
                     if(velocity.x != 0){
                     b.m_linearVelocity.x -= b.m_linearVelocity.x * 0.003;
                     if(Math.abs(b.m_linearVelocity.x) < 0.001)
                     }
                     */
                }
            }
        //    cc.log("body num is " + bodyNum);
            if(this.gameLogic.getCurStage() == GameStage.GAME_STAGE_MOVEMENT && isAllStop){
                cc.log("all body is stop!");
                this.gameLogic.switchStageTo(GameStage.GAME_STAGE_SCORE_OR_RECYCLE);
            }
        }

    },

    updateScoreLabel: function(myScore, oppScore){
        this.myScoreLabel.setString(myScore);
        this.opponentScoreLabel.setString(oppScore);
    },

    updateBallInHand: function(myBallQueue, oppBallQueue){
        this.myBQDrawNode.clear();
        this.oppBQDrawNode.clear();

        var posX = 0, posY = 0;
        var bRadius = [0, 10, 7, 5];
        if(myBallQueue.length > 0){
            posX = (myBallQueue.length - 1)*10;
            for(var i in myBallQueue){
                this.myBQDrawNode.drawDot(cc.p(posX, posY), bRadius[myBallQueue[i]], this.myBColor);
                posX -= 20;
            }

        }

        if(oppBallQueue.length > 0){
            posX = -(oppBallQueue.length - 1)*10;
            for(var i in oppBallQueue){
                this.oppBQDrawNode.drawDot(cc.p(posX, posY), bRadius[oppBallQueue[i]], this.opponentBColor);
                posX += 20;
            }

        }
    }
});

var GameScene = cc.Scene.extend({
    onEnter: function () {
        this._super();

        var layer = new MainLayer();
        this.addChild(layer, 1);
    }
});
