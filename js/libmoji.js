// libmoji.js - Identicon rendering class
// 
// Sample Code
//
//   HTML
//   
//     <script type="text/javascript" src="identicon.js"></script>
//
//   JavaScript
//   
//     canvas = document.createElement('canvas');
//     canvas.setAttribute("width", size);
//     canvas.setAttribute("height", size);
//     document.body.appendChild(canvas);
//     if (typeof G_vmlCanvasManager != "undefined") {
//         canvas = G_vmlCanvasManager.initElement(canvas);
//     }
//     code = Math.round(Math.random() * Math.pow(2, 32));
//     new Identicon(canvas, code, size);
//     

var Identicon = Identicon || {}; // Namespace

Identicon = function (canvas, hash, type) {
    "use strict";

    this.setCanvas(canvas);
    this.update(hash, type);
};

Identicon.prototype = {
    MIN_SIZE: 16, // minimal size the canvas will let create it-self
    DEFAULT_SIZE: 32, // minimal size the canvas will let create it-self
    PIXEL: 32, // amount of theoretical pixel on one side
    METHOD_MARKER: "drawIdent",
    type: "Default",

    update: function (hash, type) {
        this.setHash(hash);
        this.setType(type);
        this.render();
    },

    setHash: function(hash) {
        if (hash && Identicon.Help.isSHA1(hash.toString())) {
            this.HASH = hash;
        } else {
            // set the SHA1 or generate
            if (hash)  {
                this.HASH = CryptoJS.SHA1(hash);
            } else {
                this.HASH = CryptoJS.SHA1(Math.random().toString());
            }
        }
        this.HASHTYPE = "SHA1";
    },

    setType: function (type) {
        if (typeof type === "string") {
            if (typeof this[this.METHOD_MARKER+type] === "function") {
                this.type = type;
                this.draw = this[this.METHOD_MARKER+type];
            } else {
                this.draw = this[this.METHOD_MARKER+this.type];
            }
        } else {
            this.draw = this[this.METHOD_MARKER+this.type];
            if (typeof type === "function") {
                this.type = type.toString();
                this.draw = type;
            }
        }
    },

    getCanvas: function() {
        return this.canvas;
    },

    setCanvas: function(canvas) {
        if (typeof canvas === "string") {
            canvas = document.getElementById(canvas);
        }
        if (!(typeof canvas === "object") || (canvas === null)) {
            canvas = document.createElement("canvas");
        }

        if (canvas.getAttribute("width") === null || canvas.getAttribute("width") < this.MIN_SIZE) {
            canvas.setAttribute("width", this.DEFAULT_SIZE);
        }
        if (canvas.getAttribute("height") === null || canvas.getAttribute("height") != canvas.getAttribute("width")) {
            canvas.setAttribute("height", canvas.getAttribute("width"));
        }
        if (canvas.getAttribute("id") === null) {
            canvas.setAttribute("id", "identicon"+Identicon.IdManager.getInstance().getId());
        }

        this.canvas = canvas;

        var that = this;
        this.canvas.getIdenticon = function () { return that; }
    },

    getSize: function() {
        return this.canvas.getAttribute('width');
    },

    render: function(canvas) {
        canvas = canvas || this.canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.save();
        var ratio = this.PIXEL / this.getSize();
        this.ctx.scale(1/ratio, 1/ratio);
        this.drawInit();
        this.draw();
        this.doStegano();
        this.ctx.scale(ratio, ratio);
        this.ctx.restore();
    },

    getMethods: function() {
        var methods = [];
        for(var m in this) {
            if (typeof this[m] === "function" && m.substring(0,this.METHOD_MARKER.length) === this.METHOD_MARKER) {
                methods.push(m);
            }
        }
        return methods;
    },

    doStegano: function () {
        var ctx = this.ctx;
        var imgData = ctx.getImageData(0,0,this.PIXEL,this.PIXEL);
        
        function mark(source, data) {
            return Math.round(source/2)*2+data;
        }
        //pattern 0000
        for (i=0; i<imgData.width*imgData.height*4;i+=4) {
            imgData.data[i] = mark(imgData.data[i],0);
            imgData.data[i+1] = mark(imgData.data[i+1],0);
            imgData.data[i+2] = mark(imgData.data[i+2],0);
        }
        ctx.putImageData(imgData,0,0);
    },

    drawIdentDefault: function() {
        return (this.drawIdentMoji());
    },

    drawIdentMoji: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,40),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            var a = m[i-1]
            var b = m[i]
            ctx.quadraticCurveTo(a.x, a.y,b.x,b.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        
        ctx.closePath();
    },

    drawIdentMatrix: function(big) {
        var BIG = 4.0;
        var size = this.PIXEL;
        var m = new Identicon.PointMatrix(size,this.HASH.toString().substring(0,32),0.5).getByDistribution(1);

        var ctx = this.ctx;
        this.ctx.fillStyle = "#000";
        m.map(function (o) {ctx.fillRect(o.y,o.x,1,1); return o;});
    },

    drawIdentFigure: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            line = new Geom.Line2D(m[i-1],m[i]);
            ctx.lineTo(line.a.x, line.a.y);
            ctx.lineTo(line.b.x,line.b.y);
        }

        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();

    },

    drawIdentFigureGrey: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;

        var grey = ((Identicon.Help.getCheckSum(this.HASH.toString())/16.0)*100.0)
        ctx.fillStyle = 'hsl(0 , 0%, '+ grey +'%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            line = new Geom.Line2D(m[i-1],m[i]);
            ctx.lineTo(line.a.x, line.a.y);
            ctx.lineTo(line.b.x,line.b.y);
        }

        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = (grey > 50) ? "#000" : "#FFF";
        ctx.fill();
        ctx.closePath();

    },

    drawIdentFigureBW: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;

        ctx.fillStyle = '#EEE';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            line = new Geom.Line2D(m[i-1],m[i]);
            ctx.lineTo(line.a.x, line.a.y);
            ctx.lineTo(line.b.x,line.b.y);
        }
        
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        
    },

    drawIdentFigureC3: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        var patchSize = 8;
        ctx.lineWidth = 1;


        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*32) +' , 100%, 50%)';
        ctx.beginPath();
        ctx.translate(size-patchSize,0);
        ctx.moveTo(0,0); ctx.lineTo(patchSize,0); ctx.lineTo(patchSize,patchSize); ctx.lineTo(0,patchSize);ctx.lineTo(0,0);ctx.fill();
        ctx.translate(-(size-patchSize),0);

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            line = new Geom.Line2D(m[i-1],m[i]);
            ctx.lineTo(line.a.x, line.a.y);
            ctx.lineTo(line.b.x,line.b.y);
        }
        
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        
    },

    drawIdentFigureC2: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;


        ctx.fillStyle = 'hsl('+ ((Identicon.Help.getCheckSum(this.HASH.toString())/2)*32) +' , 100%, 50%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            line = new Geom.Line2D(m[i-1],m[i]);
            ctx.lineTo(line.a.x, line.a.y);
            ctx.lineTo(line.b.x,line.b.y);
        }

        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        
    },

    drawIdentStar: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1,true);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+1) {
            var a = m[i]
            ctx.quadraticCurveTo(size/2,size/2,a.x, a.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        
    },

    drawIdentFigureBlob2BW: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            var a = m[i-1]
            var b = m[i]
            ctx.quadraticCurveTo(a.x, a.y,b.x,b.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        
        ctx.closePath();
    },

    drawIdentFigureTwo: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();


        var l = [];
        var r = [];
        for (var i = 0; i < m.length; i++) {
            var x = m[i];
            if (x.x < center.x) l.push(x); else r.push(x);
        }
        l.sort(function(a,b) {return Math.atan2(a.x-(center.x/2.0),a.y-center.y) - Math.atan2(b.x-(center.x/2.0),b.y-center.y);});
        r.sort(function(a,b) {return Math.atan2(a.x-(center.x+(center.x/2.0)),a.y-center.y) - Math.atan2(b.x-(center.x+(center.x/2.0)),b.y-center.y);});

        ctx.beginPath();
        back = l[0];
        for (var i = 0; i < l.length; i=i+1) {
            var a = l[i]
            ctx.lineTo(a.x, a.y);
        }
        if (!back.x == undefined) ctx.lineTo(back.x,back.y);
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.fill();
        
        ctx.beginPath();
        back = r[0];
        for (var i = 0; i < r.length; i=i+1) {
            var a = r[i]
            ctx.lineTo(a.x, a.y);
        }
        if (!back.x == undefined) ctx.lineTo(back.x,back.y);
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.fill();
    },

    drawIdentFigureTwoTail: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(1,true);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();


        var l = [];
        var r = [];
        for (var i = 0; i < m.length; i++) {
            var x = m[i];
            if (x.x < center.x) l.push(x); else r.push(x);
        }
        l.sort(function(a,b) {return Math.atan2(a.x-(center.x/2.0),a.y-center.y) - Math.atan2(b.x-(center.x/2.0),b.y-center.y);});
        r.sort(function(a,b) {return Math.atan2(a.x-(center.x+(center.x/2.0)),a.y-center.y) - Math.atan2(b.x-(center.x+(center.x/2.0)),b.y-center.y);});

        ctx.beginPath();
        back = l[0];
        for (var i = 0; i < l.length; i=i+1) {
            var a = l[i]
            ctx.lineTo(a.x, a.y);
        }
        if (!back.x == undefined) ctx.lineTo(back.x,back.y);
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.fill();
        
        ctx.beginPath();
        back = r[0];
        for (var i = 0; i < r.length; i=i+1) {
            var a = r[i]
            ctx.lineTo(a.x, a.y);
        }
        if (!back.x == undefined) ctx.lineTo(back.x,back.y);
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.fill();


        var c = m.slice(-4);
        c.sort(function(a,b) {return Math.atan2(a.x-center.x,a.y-center.y) - Math.atan2(b.x-center.x,b.y-center.y);});

        ctx.beginPath();
        back = c[0];
        for (var i = 0; i < c.length; i=i+1) {
            var a = c[i]
            ctx.lineTo(a.x, a.y);
        }
        if (!back.x == undefined) ctx.lineTo(back.x,back.y);
        ctx.closePath();
        ctx.fillStyle = "#000";
        ctx.fill();
    },

    drawIdentFigureMoji: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 0; i < m.length; i=i+1) {
            var a = m[i]
            ctx.lineTo(a.x, a.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(center.x-3, center.y, 2, 0 , 2 * Math.PI, false);
        ctx.arc(center.x+3, center.y, 2, 0 , 2 * Math.PI, false);
        ctx.fillStyle = "#FFF";
        ctx.fill();
        
        ctx.closePath();
    },

    drawIdentFigureMoji2: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            var a = m[i-1]
            var b = m[i]
            ctx.quadraticCurveTo(a.x, a.y,b.x,b.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(center.x-3, center.y, 2, 0 , 2 * Math.PI, false);
        ctx.arc(center.x+3, center.y, 2, 0 , 2 * Math.PI, false);
        ctx.fillStyle = "#FFF";
        ctx.fill();
        ctx.closePath();
    },

    drawIdentFigureMoji3: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.beginPath();
        back = m[0];
        for (var i = 1; i < m.length; i=i+2) {
            var a = m[i-1]
            var b = m[i]
            ctx.quadraticCurveTo(a.x, a.y,b.x,b.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
        ctx.beginPath();
        ctx.arc(center.x, center.y, 3, 0 , 2 * Math.PI, false);
        ctx.fillStyle = "#FFF";
        ctx.fill();
        ctx.closePath();
    },

    drawIdentFigureBlob: function() {
        var m = new Identicon.PointMatrix(this.PIXEL, this.HASH.toString().substring(0,32),0.5).getByDistribution(2);
        var ctx = this.ctx;
        var size = this.PIXEL;
        ctx.lineWidth = 1;
        var center = new Geom.Point2D(size/2,size/2);

        ctx.fillStyle = 'hsl('+ (Identicon.Help.getCheckSum(this.HASH.toString())*16) +' , 80%, 70%)';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(size,0); ctx.lineTo(size,size); ctx.lineTo(0,size);ctx.lineTo(0,0);ctx.fill();

        ctx.beginPath();
        back = m[0];
        for (var i = 0; i < m.length; i=i+1) {
            var a = m[i]
            ctx.lineTo(a.x, a.y);
        }
        ctx.lineTo(back.x,back.y);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.closePath();
    },

    drawIdentMinimal: function(small,full) {
        hash = this.HASH.toString();
        var BIG = 4.0;
        
        var pixel = small ? this.PIXEL : this.PIXEL / BIG;
        var pixelSize = this.PIXEL / pixel;
        
        for (var i=0; (i<hash.length || full) && i < (pixel * pixel); i++) {
            this.ctx.fillStyle = 'hsl('+ (Identicon.Help.getIntFromHexAt(i % hash.length,hash)*16)+' , 100%, 50%)';
            this.ctx.fillRect((i % pixel)*pixelSize, Math.floor(i/pixel)*pixelSize, pixelSize, pixelSize);
        }
    },

    drawIdentText: function() {
        var text = this.HASH.toString();
        this.ctx.font = "10pt Courier New";
        this.canvas.setAttribute("width", this.ctx.measureText(text).width+20);
        this.ctx.font = "10pt Courier New";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(text, 10,this.canvas.height);
    },

    drawIdentText10: function() {
        var text = this.HASH.toString().substr(0,10);
        this.ctx.font = "10pt Courier New";
        this.canvas.setAttribute("width", this.ctx.measureText(text).width+20);
        this.ctx.font = "10pt Courier New";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(text, 10,this.canvas.height);
    },

    drawIdentGravIdenticon: function() {
          var ctx = this.ctx; var size = this.canvas.width;
          var img = new Image();
          img.src = 'http://www.gravatar.com/avatar/'+this.HASH.toString().substr(0,32)+'?d=identicon&s='+size;
          img.onload = function () {
              ctx.drawImage(img,0,0,size,size);
          }
    },

    drawIdentGravMonsterid: function() {
          var ctx = this.ctx; var size = this.canvas.width;
          var img = new Image();
          img.src = 'http://www.gravatar.com/avatar/'+this.HASH.toString().substr(0,32)+'?d=monsterid&s='+size;
          img.onload = function () {
              ctx.drawImage(img,0,0,size,size);
          }
    },

    drawIdentGravWavatar: function() {
          var ctx = this.ctx; var size = this.canvas.width;
          var img = new Image();
          img.src = 'http://www.gravatar.com/avatar/'+this.HASH.toString().substr(0,32)+'?d=wavatar&s='+size;
          img.onload = function () {
              ctx.drawImage(img,0,0,size,size);
          }
    },

    drawIdentGravRetro: function() {
          var ctx = this.ctx; var size = this.canvas.width;
          var img = new Image();
          img.src = 'http://www.gravatar.com/avatar/'+this.HASH.toString().substr(0,32)+'?d=retro&s='+size;
          img.onload = function () {
              ctx.drawImage(img,0,0,size,size);
          }
    },

    drawIdentRobohash: function() {
          var ctx = this.ctx; var size = this.canvas.width;
          var img = new Image();
          img.src = 'http://robohash.org/'+this.HASH.toString().substr(0,32)+'&size='+size+'x'+size;
          img.onload = function () {
              ctx.drawImage(img,0,0,size,size);
          }
    },

    drawInit: function() {
        this.ctx.fillStyle = "#EEE";
        this.ctx.fillRect(0, 0, this.getSize(), this.getSize());
    },

};

Identicon.init = function () {
    Array.prototype.slice.call(document.getElementsByTagName("canvas")).filter( function (o) {
        return (typeof o.getAttribute("class") === "string" && o.getAttribute("class") === "identicon") ? o : null;}).map( function (o) {
            var i = new Identicon(o, o.getAttribute("data-content"), o.getAttribute("identicon-type"));
        })
};

Identicon.PointMatrix = function (size, hash, saturation) {
    "use strict";

    saturation = saturation || 0.9;

    this.sorting  =
    {
        CENTER: 1,
        CLOCK: 2,
    }

    this.getByRastering = function () {
        var m = [];
        
        for (var u=0; u<size; u++) {
            for (var v=0; v<size; v++) {
                var data = Identicon.Help.getIntFromHexAt((u * size + v) % hash.length, hash) / 16;
                if (data < saturation) {
                    m.push(new Geom.Point2D(u,v));
                }
            }
        }
        return m;
    };
    
    this.getByDistribution = function (sort, dir) {
        var m = [];
        var cypher = 0;
        var center = new Geom.Point2D(size/2,size/2);
        var getJump = function (cypher) {return cypher * (Math.pow(size,2) / ((hash.length+1) * 16 / 2));};
        var jump = getJump(Identicon.Help.getIntFromHexAt(cypher++,hash));
        for (var u=0; u<size; u++) {
            for (var v=0; v<size; v++) {
                if (jump <= 0 && cypher < hash.length)  {
                    var data = Identicon.Help.getIntFromHexAt(cypher++,hash);
                    if ((data/15 > 1-saturation)) {
                        m.push(new Geom.Point2D(u,v));
                    }
                    jump = getJump(data);
                } else {
                    jump--;
                }
            }
        }
        
        if (sort == this.sorting.CENTER) {
            if (dir)
                m.sort(function(a,b) {return center.distance(b) - center.distance(a);});
            else
                m.sort(function(a,b) {return center.distance(a) - center.distance(b);});
        }
        if (sort == this.sorting.CLOCK) {
            if (dir)
                m.sort(function(a,b) {return Math.atan2(a.x-center.x,a.y-center.y) - Math.atan2(b.x-center.x,b.y-center.y);});
            else
                m.sort(function(a,b) {return Math.atan2(b.x-center.x,b.y-center.y) - Math.atan2(a.x-center.x,a.y-center.y);});
        }
        return m;
    };
};

Identicon.IdManager = (function () {
    "use strict";
    var instance;
    function Singleton() {
        if (instance) {
            return instance;
        }
        instance = this;
        var id = 0;
        
        this.getId = function () {
            return id++;
        };
    }
    Singleton.getInstance = function () {
        return instance || new Singleton();
    };
    return Singleton;
}());

Identicon.Help = new function () {
    "use strict";
    return {
        isSHA1: function (str) {
            var sha1Patt = new RegExp('^[0-9a-f]{40}$','i');
            return sha1Patt.test(str);
        },
        getIntFromHex: function (hash) {
            var val = parseInt(hash.toString(),16);
            if(isNaN(val)) {throw new TypeError(hash + " is not hexadecimal");}
            return val;
        },
        getIntFromHexAt: function (cypher, hash) {
            var val = parseInt(hash.toString().charAt(cypher),16);
            if(isNaN(val)) {throw new TypeError(hash + " is not hexadecimal");}
            return val;
        },
        getCheckSum: function (hash) {
            var chk = 0;
            for (var i = 0; i < hash.length-1; i++) {
                chk += (Identicon.Help.getIntFromHexAt(i,hash)*i);
            }
            if(isNaN(chk)) throw new TypeError(hash + " is not hexadecimal");
            return chk % 16;
        },
    };
};
