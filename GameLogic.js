/**
 * Created by billbao on 2016/3/25.
 */

var GameStage = {};
GameStage.GAME_STAGE_INIT = 0;
GameStage.GAME_STAGE_BALL = 1;
GameStage.GAME_STAGE_MOVEMENT = 2;
GameStage.GAME_STAGE_SCORE_OR_RECYCLE = 3;
GameStage.GAME_STAGE_CHANGE_TURN = 4;
GameStage.GAME_STAGE_GAME_OVER = 5;


var GameLogic = function(layer){
    this.gameLayer = layer;

    this._lastStage = -1;
    this._curStage = -1;

    this.myScore = 0;
    this.opponentScore = 0;

    this.myBallQueue = [];
    this.oppBallQueue = [];
    this.deadQueue = [];
    this.myNextBallIndex = 0;
    this.oppNextBallIndex = 0;
    this.mySType = 0;
    this.oppSType = 0;
    this.curTurn = 0;
    this.curBall = null;

    this.validTouchArea = cc.rect(0, 0, 0, 0);
    this._downPoint = null;

    this._firstPoint = null;
    this._lastPoint = null;
    this.isEffectMoved = false;
    this.isTouchedDown = false;
};

GameLogic.prototype.getCurStage = function(){
    return this._curStage;
};

GameLogic.prototype.getLastStage = function(){
    return this._lastStage;
};

GameLogic.prototype.switchStageTo = function(nextStage){
    this._lastStage = this._curStage;
    this._curStage = nextStage;

    switch(this._curStage){
        case GameStage.GAME_STAGE_INIT:{
            this.initGame();
        }break;
        case GameStage.GAME_STAGE_BALL:{
            this.setCurBallStage();
            this.updateDrawOfHandBall();
        }break;
        case GameStage.GAME_STAGE_MOVEMENT:{
            cc.log("body moving");
        }break;
        case GameStage.GAME_STAGE_SCORE_OR_RECYCLE:{
            cc.log("is score?");
            this.scoreOrRecycle();
            this.checkLeftBall();
            this.updateDrawOfHandBall();
        }break;
        case GameStage.GAME_STAGE_CHANGE_TURN:{
            cc.log("change turn");
            this.changeTurn();
        }break;
        case GameStage.GAME_STAGE_GAME_OVER:{
            cc.log("game over");
            this.gameOver();
        }break;
        default:{
            cc.log("unkown game stage!!");
        }
    }
};

GameLogic.prototype.updateLogic = function(){
    switch(this._curStage){
        case GameStage.GAME_STAGE_INIT:{

        }break;
        case GameStage.GAME_STAGE_BALL:{

        }break;
        case GameStage.GAME_STAGE_MOVEMENT:{

        }break;
        case GameStage.GAME_STAGE_SCORE_OR_RECYCLE:{

        }break;
        case GameStage.GAME_STAGE_CHANGE_TURN:{

        }break;
        case GameStage.GAME_STAGE_GAME_OVER:{

        }break;
        default:{
            cc.log("unkown game stage!!");
        }
    }
};

GameLogic.prototype.onTouchBegan = function(point){
    this._lastPoint = null;
    this.isEffectMoved = false;
    this._firstPoint = null;
    this._lastPoint = null;
    this.isTouchedDown = false;
    if (this.getCurStage() == GameStage.GAME_STAGE_BALL && cc.rectContainsPoint(this.validTouchArea, point)) {
        this._downPoint = point;
        this.isTouchedDown = true;
    //    cc.log("downPoint  x:" + point.x + ", y:" + point.y);
        return true;
    }

    return false;
};
GameLogic.prototype.onTouchMoved = function(point){
    if (this.getCurStage() == GameStage.GAME_STAGE_BALL && this.isTouchedDown) {

        if (this.isEffectMoved) {
            this._lastPoint = point;
        //    cc.log("movedPoint  x:" + point.x + ", y:" + point.y);
        } else {
            if (Math.abs(point.x - this._downPoint.x) > 10 || Math.abs(point.y - this._downPoint.y) > 10) {
                this.isEffectMoved = true;
                this._firstPoint = point;
            }
        }
    }
};
GameLogic.prototype.onTouchEnded = function(point){
    this.isEffectMoved = false;
    this.isTouchedDown = false;
};
GameLogic.prototype.onTouchCancelled = function(point){
    this.isEffectMoved = false;
    this.isTouchedDown = false;
};
GameLogic.prototype.touchSampling = function(dt){
    if(this.getCurStage() == GameStage.GAME_STAGE_BALL
        && this.isTouchedDown
        && this.isEffectMoved
        && this._firstPoint != null
        && this._lastPoint != null){
        this.isTouchedDown = false;
        this.isEffectMoved = false;
        var delta = cc.p(this._lastPoint.x - this._firstPoint.x, this._lastPoint.y - this._firstPoint.y);
        cc.log("delta x:" + delta.x + ", y:" + delta.y);
        //     var winSize = cc.director.getWinSize();
        this.sendABall(this.curBall, cc.p(delta.x / 0.2, delta.y / 0.2));
        this.curBall = null;
    }
};


GameLogic.prototype.initGame = function(){
    this.mySType = SType_Red;
    this.oppSType = SType_Blue;
    var BSQ = [2,3,1,3,2,1,3,2,1,3,2,1];
    var ball_num = 12;
    for(var i = 0; i < ball_num; i++){
        var ball = new IceBall();
        ball.ID = i+1;
        ball.status = IBStatus.IN_HAND;
        ball.ballSize = BSQ[i];
        ball.beRecycled = false;
        ball.posX = 0;
        ball.posY = 0;
        if(i < 6){
            ball.belonger = SType_Red;
            if(this.mySType == SType_Red){
                this.myBallQueue.push(ball);
            }else{
                this.oppBallQueue.push(ball);
            }
        }else{
            ball.belonger = SType_Blue;
            if(this.mySType == SType_Blue){
                this.myBallQueue.push(ball);
            }else{
                this.oppBallQueue.push(ball);
            }
        }
    }
    this.myNextBallIndex = 0;
    this.oppNextBallIndex = 0;
    this.curTurn = SType_Red;
};

GameLogic.prototype.setCurBallStage = function(){
    var curBallPoint = null;
    if(this.curTurn == this.mySType){
        this.curBall = this.myBallQueue[this.myNextBallIndex++];
        curBallPoint = MY_BALL_POINT;
    }else{
        this.curBall = this.oppBallQueue[this.oppNextBallIndex++];
        curBallPoint = OPP_BALL_POINT;
    }
    this.curBall.status = IBStatus.IN_AREA;
    this.curBall.ballSprite = this.gameLayer.newABall(this.curBall.ballSize, curBallPoint, this.curTurn);
    this.validTouchArea = cc.rect(curBallPoint.x - 75, curBallPoint.y - 75, 75 * 2, 75 * 2);
};

GameLogic.prototype.sendABall = function(ball, speed){
    if(ball && ball.ballSprite){
        ball.status = IBStatus.IN_AREA;
        var gear = 1.5;
        var body = ball.ballSprite.getBody();
        body.SetAwake(true);
        body.SetLinearVelocity(new b2Vec2(gear * speed.x / PTM_RATIO, gear * speed.y / PTM_RATIO));
        cc.log("sendABall with speed x:" + speed.x + ", y:" + speed.y);
    }else{
        cc.log("ballSprite is null");
    }

    this.switchStageTo(GameStage.GAME_STAGE_MOVEMENT);
};

GameLogic.prototype.scoreOrRecycle = function(){
    this.myScore = 0;
    this.opponentScore = 0;

    for(var i = 0; i < this.myBallQueue.length; ){
        var ball = this.myBallQueue[i];

        if(ball.status != IBStatus.IN_AREA){
            break;
        }

        var pos = ball.ballSprite.getPosition();
    //    cc.log("ballSprite PosX:" + pos.x + ", PosY:" + pos.y);
    //    cc.log("ballSprite x:" + ball.ballSprite.x + ",y:" + ball.ballSprite.y);

        if(ball.ballSprite && cc.rectContainsPoint(MY_SCORE_AREA, ball.ballSprite.getPosition())) {
            ball.status = IBStatus.IN_AREA;
            this.myScore++;
            i++;
        }else if(ball.ballSprite && cc.rectContainsPoint(OPP_SCORE_AREA, ball.ballSprite.getPosition())){
            ball.status = IBStatus.IN_AREA;
            i++;
        }else if(ball.ballSprite && !ball.beRecycled){
            if(cc.rectContainsPoint(MY_RECYCLE_AREA, ball.ballSprite.getPosition())){
                this.recycleBall(ball, this.mySType);
                this.myBallQueue.splice(i, 1);
            }else{
                this.recycleBall(ball, this.oppSType);
                this.myBallQueue.splice(i, 1);
            }
        }else{
            this.killBall(ball);
            this.myBallQueue.splice(i, 1);
        }
    }


    for(var i = 0; i < this.oppBallQueue.length; ){
        var ball = this.oppBallQueue[i];

        if(ball.status != IBStatus.IN_AREA){
            break;
        }

        if(ball.ballSprite && cc.rectContainsPoint(OPP_SCORE_AREA, ball.ballSprite.getPosition())){
            ball.status = IBStatus.IN_AREA;
            this.opponentScore ++;
            i++;
        }else if(ball.ballSprite && cc.rectContainsPoint(MY_SCORE_AREA, ball.ballSprite.getPosition())){
            ball.status = IBStatus.IN_AREA;
            i++;
        }else if(ball.ballSprite && !ball.beRecycled){
            if(cc.rectContainsPoint(MY_RECYCLE_AREA, ball.ballSprite.getPosition())){
                this.recycleBall(ball, this.mySType);
                this.oppBallQueue.splice(i, 1);
            }else{
                this.recycleBall(ball, this.oppSType);
                this.oppBallQueue.splice(i, 1);
            }
        }else{
            this.killBall(ball);
            this.oppBallQueue.splice(i, 1);
        }
    }

    this.gameLayer.updateScoreLabel(this.myScore, this.opponentScore);
};

GameLogic.prototype.recycleBall = function(ball, belonger){
    ball.status = IBStatus.IN_HAND;
    ball.belonger = belonger;
    ball.beRecycled = true;
    if(ball.ballSprite != null){
        var body = ball.ballSprite.getBody();
        body && this.gameLayer.world.DestroyBody(body);
        ball.ballSprite.removeFromParent();
    }
    ball.ballSprite = null;
    if(belonger == this.mySType){
        this.myBallQueue.push(ball);
    }else{
        this.oppBallQueue.push(ball);
    }
};

GameLogic.prototype.killBall = function(ball){
    ball.status = IBStatus.DEAD;
    ball.belonger = -1;
    if(ball.ballSprite != null){
        var body = ball.ballSprite.getBody();
        body && this.gameLayer.world.DestroyBody(body);
        ball.ballSprite.removeFromParent();
    }
    ball.ballSprite = null;
    this.deadQueue.push(ball);
};

GameLogic.prototype.checkLeftBall = function(){
    var isUseUp = true;
    for(var i = 0; i < this.myBallQueue.length; i++){
        if(this.myBallQueue[i].status == IBStatus.IN_HAND){
            this.myNextBallIndex = i;
            isUseUp = false;
            break;
        }
    }
    if(isUseUp){
        this.myNextBallIndex = -1;
    }

    isUseUp = true;
    for(var i = 0; i < this.oppBallQueue.length; i++){
        if(this.oppBallQueue[i].status == IBStatus.IN_HAND){
            this.oppNextBallIndex = i;
            isUseUp = false;
            break;
        }
    }
    if(isUseUp){
        this.oppNextBallIndex = -1;
    }

    if(this.myNextBallIndex == -1 && this.oppNextBallIndex == -1){
        this.switchStageTo(GameStage.GAME_STAGE_GAME_OVER);
    }else{
        if(this.curTurn == this.mySType){
            if(this.oppNextBallIndex != -1){
                this.switchStageTo(GameStage.GAME_STAGE_CHANGE_TURN);
            }else{
                this.switchStageTo(GameStage.GAME_STAGE_BALL);
            }
        }else{
            if(this.myNextBallIndex != -1){
                this.switchStageTo(GameStage.GAME_STAGE_CHANGE_TURN);
            }else{
                this.switchStageTo(GameStage.GAME_STAGE_BALL);
            }
        }
    }
};

GameLogic.prototype.getBallQueueInHand = function(ballQueue){
    var bq = [];
    for(var i in ballQueue){
        if(ballQueue[i] && ballQueue[i].status == IBStatus.IN_HAND){
            bq.push(ballQueue[i].ballSize);
        }
    }

    return bq;
};

GameLogic.prototype.updateDrawOfHandBall = function(){
    var myBQ = this.getBallQueueInHand(this.myBallQueue);
    var oppBQ = this.getBallQueueInHand(this.oppBallQueue);

    this.gameLayer.updateBallInHand(myBQ, oppBQ);
};

GameLogic.prototype.changeTurn = function(){
    if(this.curTurn == this.mySType){
        this.curTurn = this.oppSType;
    }else{
        this.curTurn = this.mySType;
    }
    this.switchStageTo(GameStage.GAME_STAGE_BALL);
};

GameLogic.prototype.gameOver = function(){
    var config = {
        myScore: 0,
        oppScore: 0,
        replayCallback: function(){
            cc.log("replayCallback");
            this.replay();
        }.bind(this)
    };
    GameOverLayer.Show(config);
};

GameLogic.prototype.clearBall = function(ball){
    if(ball.ballSprite != null){
        var body = ball.ballSprite.getBody();
        body && this.gameLayer.world.DestroyBody(body);
        ball.ballSprite.removeFromParent();
    }
    ball.ballSprite = null;
};

GameLogic.prototype.clearGame = function(){
    this.myScore = 0;
    this.opponentScore = 0;

    for(var i = 0; i < this.myBallQueue.length; i++){
        var ball = this.myBallQueue[i];
        this.clearBall(ball);

    }


    for(var i = 0; i < this.oppBallQueue.length; i++){
        var ball = this.oppBallQueue[i];
        this.clearBall(ball);
    }

    this.myBallQueue.splice(0, this.myBallQueue.length);
    this.oppBallQueue.splice(0, this.oppBallQueue.length);
    this.deadQueue.splice(0, this.deadQueue.length);

    this.gameLayer.updateScoreLabel(this.myScore, this.opponentScore);
};

GameLogic.prototype.replay = function(){
    cc.log("replay");
    this.clearGame();
    this.switchStageTo(GameStage.GAME_STAGE_INIT);
    this.switchStageTo(GameStage.GAME_STAGE_BALL);
};