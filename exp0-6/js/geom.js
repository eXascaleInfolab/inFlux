// geom.js - Some 2d geometry helper functions

var Geom = Geom || {}; // Namespace

Geom.Point2D = function (x, y) {
    "use strict";

    x = x || 0;
    y = y || 0;

    this.__defineGetter__("x", function () {
        return x;
    });

    this.__defineSetter__("x", function (val) {
        x = val;
    });

    this.__defineGetter__("y", function () {
        return y;
    });

    this.__defineSetter__("y", function (val) {
        y = val;
    });

    this.toString = function () {
        return x + "," + y;
    };

    this.distance = function (oP) {
        Geom.Point2D.checkType(oP);
        return Math.sqrt(Math.pow(x - oP.x, 2) + Math.pow(y - oP.y, 2));
    };


};

Geom.Point2D.checkType = function (oP) {
    "use strict";
    if (!(typeof oP.x === "number" && typeof oP.y === "number")) {
        throw new TypeError(oP + " is not a valid point");
    } else { return true; }
};

Geom.Line2D = function (a, b) {
    "use strict";

    a = a || new Geom.Point2D();
    b = b || new Geom.Point2D();
    
    this.__defineGetter__("a", function () {
        return a;
    });

    this.__defineSetter__("a", function (val) {
        Geom.Point2D.checkType(val);
        a = val;
    });

    this.__defineGetter__("b", function () {
        return b;
    });

    this.__defineSetter__("b", function (val) {
        Geom.Point2D.checkType(val);
        b = val;
    });

    this.__defineGetter__("length", function () {
        return a.distance(b);
    });

    this.toString = function () {
        return this.a + "/" +this.b;
    };

    this.closestPointToPoint = function (oP) {
        Geom.Point2D.checkType(oP);
        var dx = this.b.x - this.a.x;
        var dy = this.b.y - this.a.y;
        if ((dx === 0) && (dy === 0)) {
            return this.a;
        } else {
            var t = ((oP.x - this.a.x) * dx + (oP.y - this.a.y) * dy) / (Math.pow(dx,2) + Math.pow(dy,2));
            t = Math.min(Math.max(0,t),1);
            return new Geom.Point2D(this.a.x + t * dx, this.a.y + t * dy);
        }
    };

    this.closestLineToPoint = function (oP) {
        return new Geom.Line2D(this.closestPointToPoint(oP), oP);
    };

    this.closestLineToLine = function (oL) {
        Geom.Line2D.checkType(oL);
        
        var cand = [this.closestLineToPoint(oL.a), this.closestLineToPoint(oL.b),
                    oL.closestLineToPoint(this.a), oL.closestLineToPoint(this.b), ];
        cand.sort(function(a,b) {return a.length - b.length;});
        return cand[0];
    };

};

Geom.Line2D.checkType = function (oL) {
    "use strict";
    if (!(typeof oL.a === "object" && typeof oL.b === "object" && Geom.Point2D.checkType(oL.a) && Geom.Point2D.checkType(oL.b))) {
        throw new TypeError(oL + " is not a valid line");
    } else { return true; }
};