
var Template = {}
Template.message = Handlebars.compile($("#container-message").html());
Template.trialmessage = Handlebars.compile($("#trial-message").html());
Template.identicon = Handlebars.compile($("#div-block-ident").html());

$('#submitButton').click(function(e) {
      $("#container-main").hide();
      $("#survey").show();
      $('#submitButton').hide();
    })
$('#survey-close').click(function(e) {
      e.preventDefault();
      $("#container-main").show();
      $("#survey").hide();
      $('#submitButton').show();
    })
$('#survey-submit').click(function(e) {
      e.preventDefault();
      if($('input[type=radio]:checked').length<=12)
      {
        alert("Please answer faithfully all the question.");
      } else {
        // somehow .. try to make sure that the json is in the value of $("#data")
        $.ajax( { url: "https://api.mongolab.com/api/1/databases/influx/collections/"+Application.experiment.name+"?apiKey=FzmG9iesxbf045DUjY1tfo65U7584rWO",
          data: JSON.stringify( Application.experiment ),
          type: "POST",
          contentType: "application/json" 
        }).fail(function() {
          // if we fail with mongolab attach the json to #data
          exp = Application.experiment;
          $("#data").val(JSON.stringify(exp));
        }).always(function() {
          // submit the form anyway
            $("#container-main").show();
            $("#survey").hide();
            $("#survey-close").hide();
            $('#submitButton').attr('disabled', true);
            $('#submitButton').hide();
            $('#status').hide();
          $('#container-main').html(Template.message(
          { title: "", 
            paragraphs: [
                "This is your code: <h3>",Application.experiment.workerId,"</h3>",
                ]
            }));    
        });
      }
    })

//REMOVE
// $('#mturk_form').submit(function(e) {
//     e.preventDefault();
//     console.log('Input : '+$('input[type="radio"]').val());
//     console.log('DATA :  '+$("#data").val());
//   });

var actuator = new HTMLActuator();

var Difficulty =  {};

Difficulty.fun1 = function () {
    var currentSet = Application.experiment.sets[Application.pointer-1];
    
    // look at this variable to change the amount
    console.log(currentSet.tasks);
    vdiff = $("#diff").val();
    Application.experiment.difficulty = vdiff;
    return vdiff;
}

var Application =  {};
Application = StateMachine.create({

  initial: 'initial',

  events: [
    { name: 'load', from: 'initial', to: 'welcome' },
    { name: 'startExperiment', from: 'welcome', to: 'experiment' },
    { name: 'startTaskSet', from: ['experiment', 'taskset'], to: 'taskset' },
    { name: 'finishExperiment', from: 'taskset', to: 'debriefing' }
  ],

  callbacks: {
    onload: function (event, from, to, msg) {
        this.experiment = msg;
        this.pointer = 0;
        $("#total-span").text(totalTasks);
        Application.experiment.workerId = guid();
        Application.startExperiment();
    }, 

    onwelcome: function() { $('#container-main').html(Template.message(
          { title: "", 
            paragraphs: [
                "<h3>Instructions To read before accepting</h3>",
                "We will show you 1 image on the left, and your task is to detect if there is a duplicate among the set on the right.",
                "Press <a class=\"btn btn-inverse disabled\">J</a> if you find a match.",
                "Press <a class=\"btn btn-inverse disabled\">F</a> if there are NO matches.",
                "If you wish, you can change the <a class=\"btn btn-inverse disabled\">Difficulty</a> after each task.",
                "A corresponding bonus will be granted for the correct answers.",
                "You can stop at any moment by clicking submit and filling the survey.",
                ]
        })); },

    onleavewelcome: function() {
        $('#nav-welcome').toggleClass('active');
    },

    onexperiment: function() {
        this.experiment.start = new Date;
        //this.goFullscreen();
        this.startTaskSet();
        },

    ontaskset: function () {
        var TaskSet =  {
            load : function (set, time) {
                this.set = set;
                this.time = time;
            },
            dispatch : function () {
                var lefttasks = this.set.tasks.filter(function (el){return (el.result == undefined);});
                if (lefttasks.length > 0) {
                    var tasktodo = lefttasks[0];
                    var fsm = StateMachine.create(task);
                    fsm.load(tasktodo, this.time);
                    var thattaskset = this;
                    fsm.callBack = function () {thattaskset.dispatch()};
                } else {
                    this.callBack();
                }
            },
        };

        var that = this;

        TaskSet.load(this.experiment.sets[this.pointer], this.experiment.time || false);
        if (this.pointer < this.experiment.sets.length-1) {
            TaskSet.callBack = function () { that.ontaskset();};
        } else {
            TaskSet.callBack = function () { that.finishExperiment();};
        }
        TaskSet.dispatch();
        this.pointer++;
        },

    onbeforefinishExperiment: function() {
        this.leaveFullscreen();
        },

    ondebriefing: function() {
            $("#container-main").hide();
            $("#survey").show();
            $("#survey-close").hide();
            $('#submitButton').attr('disabled', true);
            $('#submitButton').hide();
            that = this;
        }, 
    }
});

Application.goFullscreen = function () {
    //$('.navbar').hide('fast');
    $('#container-main').height($(document).height());
    if (this.experiment.fullscreen) {
        var docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    }
};

Application.leaveFullscreen = function () {
    //$('.navbar').show('slow');
    $('#container-main').height('auto');
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    }
    else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
};

window.onbeforeunload = function() {
  return "Data will be lost if you leave the page, are you sure?";
};

TaskFSM = function () {
    this.load();
}

TaskFSM.prototype = {

    onload: function (event, from, to, msg, time) {
        this.task = msg;
        this.time = time;
    },

    onready: function() {
        var that = this;
        $(document).bind("keypress", function(e) {
            if (e.which > 0) {
                e.preventDefault();
                that.set();
            }
        });
        $('#container-main').html(Template.trialmessage("<kbd>When ready, press Any Key</kbd>"));
        $("#diff").val(Application.experiment.difficulty);
        $('#fj').hide();
        $('#opt').show();
    },

    onbridge: function() {
        var that = this;
        that.set();
    },

    onleaveready: function () {
        $(document).unbind("keypress");
    },

    oncross: function() {
        var that = this;

        function countDown(){
           n--;
           if(n == 0){
              that.stop('timeout'); 
              clearInterval(that.tm);
           }
           $("#timer").text(msToTime(n*100));
        }

        function msToTime(duration) {
            var milliseconds = parseInt((duration%1000)/100)
                , seconds = parseInt((duration/1000)%60)
                , minutes = parseInt((duration/(1000*60))%60);
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;

            return minutes + ":" + seconds + ":" + milliseconds;
        }

        $(document).bind('keypress', function(e) {
            if (e.which == 106) {
                e.preventDefault();
                that.stop(true);
            }
            if (e.which == 102) {
                e.preventDefault();
                that.stop(false);
            }
        });

        if (this.time) {
            var n = this.time * 10;
            var tm = setInterval(countDown,100);
            that.tm = tm;
        }

        // prepare the test by deciding if similar figure is shown and if at which places
        var a,b;
        var amount = 0;
        // use function or number
        if (typeof this.task.amount === 'number') {
            amount = this.task.amount;
        } else if (typeof this.task.amount === 'string') {
            amount = Difficulty[this.task.amount]();
        } else {
            console.log("amount neither number nor function name");
        }
        this.task.difficulty = amount;

        if (this.task.similar == undefined) {this.task.similar = (Math.round(Math.random()) == 1);}
        if (this.task.similar) {
            a = Math.floor((Math.random()*(amount-1)));
            b = Math.floor((Math.random()*(amount-2)));
            if (b == a) {
                b = amount-1;
            }
            var similarData = new Date().getTime().toString();
        }

        // preload in hidden container the content 
        $('#container-preload').html(Template.trialmessage('<div id="identifiers-preload" class="row" style="display: inline-block;"><div class="span1" style="" id="left-preload"></div><div class="span4" id="right-preload"></div></div>'));
        $('#left-preload').append(Template.identicon({ data: similarData, type: this.task.type}));
        for (var i = 1; i < amount; i++) {
            var data = "";
            if (b == i) {
                data = similarData;
            };
            $('#right-preload').append(Template.identicon({ data: data, type: this.task.type}));
        }
        Identicon.init();

        // container gets loaded with counting
        $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkred;"></p>')); 
        //var cross = $('#cross');
        //setTimeout(function () {cross.html('Loading Next Task ...'); setTimeout(function () {that.start();},1000);});
        that.start();
    },

    oncontent: function() {
        $('#container-main').html(Template.trialmessage('<div id="identifiers" class="row" style="display: inline-block;" ></div>'));
        $('#identifiers').replaceWith($('#identifiers-preload'));
        $('#opt').hide();
        $('#fj').show();
        this.timeStart = new Date().getTime();
    },

    onleavecontent: function() {
        $(document).unbind('keypress');
        $('#fj').hide();
    },
        
    onend: function(event, from, to, msg) {
        $('#fj').hide();
        var that = this;
        this.task.result = {}
        this.task.result.time = new Date().getTime() - this.timeStart;
        totalDone++;
        $("#totalDone").val(totalDone);
        var leftTasks = totalTasks - totalDone;
        var percentLeft = leftTasks/totalTasks *100;
        $("#total-span").text(leftTasks);
        if (msg == 'timeout') {
                $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkorange;">Time over!, '+this.task.result.time+' ms</p>')); 
                this.task.result.correct = false;
                this.task.result.timeover = true;
        } else {
            clearInterval(this.tm);
            if (this.task.similar == msg) {
                $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkgreen;">Correct, '+this.task.result.time+' ms</p>')); 
                this.task.result.correct = true;
                totalCorrect++;
                rate = 0.01;
                if(this.task.difficulty-1 == 6)
                    rate = 0.013;
                if(this.task.difficulty-1 == 24)
                    rate = 0.015;
                if(this.task.difficulty-1 == 60)
                    rate = 0.02;
                totalBonus = totalBonus + rate;
                var bo = Number((totalBonus).toFixed(3));
                actuator.updateScore(bo);
                console.log(bo);
                $("#totalCorrect").val(totalCorrect);

            } else {
                $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkred;">Wrong, '+this.task.result.time+' ms</p>')); 
                this.task.result.correct = false;
            }
            this.task.result.timeover = false;
            this.task.result.stop = new Date;
            $('#fj').hide();
            $("#diff").val(Application.experiment.difficulty);
        }
        // DED: push the json in the value of data
        //$("#data").val(JSON.stringify( Application.experiment ));
        //
        Application.experiment.stop = this.task.result.stop;
        Application.experiment.overallTime = Application.experiment.stop - Application.experiment.start;
        setTimeout(function () {that.callBack();}, 400);
        },
}

var totalTasks = 200;
var totalCorrect = 0;
var totalBonus = 0;
var totalDone = 0;
var taskPrice = 0.01;

var task = {
  target: TaskFSM.prototype,
  initial: "initial",

  events: [
    { name: 'load', from: 'initial', to: 'ready' },
    { name: 'set', from: 'ready', to: 'cross' },
    { name: 'start', from: 'cross', to: 'content' },
    { name: 'stop', from: 'content', to: 'end' },
    { name: 'restart', from: 'end', to: 'bridge' }
  ],
};

Application.load({
    name: "ETOL",
    fullscreen: true,
    workerId: 0,
    assignmentId: 0,
    difficulty: 7,
    sets: [
      {
        name: "set_validation",
        tasks: [
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        },
        {
        type: 'FigureMoji',
        amount: 'fun1',
        }
     ]},  
    ],
});
