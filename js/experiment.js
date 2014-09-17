
var Template = {}
Template.message = Handlebars.compile($("#container-message").html());
Template.trialmessage = Handlebars.compile($("#trial-message").html());
Template.identicon = Handlebars.compile($("#div-block-ident").html());

var Application =  {};
Application = StateMachine.create({

  initial: 'initial',

  events: [
    { name: 'load', from: 'initial', to: 'welcome' },
    { name: 'prepareExperiment', from: 'welcome', to: 'prepare' },
    { name: 'startExperiment', from: 'prepare', to: 'experiment' },
    { name: 'startTaskSet', from: ['experiment', 'taskset'], to: 'taskset' },
    { name: 'finishExperiment', from: 'taskset', to: 'debriefing' }
  ],

  callbacks: {
    onload: function (event, from, to, msg) {
        this.experiment = msg;
        this.pointer = 0;

        if( document.getElementById('assignmentId') ){
          document.getElementById('assignmentId').value = gup('assignmentId');
        }
        if (document.getElementById('submitButton')) {
          if (gup('assignmentId') == "ASSIGNMENT_ID_NOT_AVAILABLE" || gup('assignmentId')=="")
          {
            // If we're previewing, disable the button and give it a helpful message
            document.getElementById('submitButton').className += " disabled";
            document.getElementById('submitButton').innerHTML = "You must ACCEPT the HIT before you can submit the results.";
          } else {
            // If the user accepted, then show the task.
            // fetch assignementId and workerId e.g.: ?assignmentId=1234&workerId=Dj
              var form = document.getElementById('mturk_form');
              if (document.referrer && ( document.referrer.indexOf('workersandbox') != -1) ) {
                  form.action = "https://www.mturk.com/mturk/externalSubmit";
              }
              Application.prepareExperiment();
          }
        }
    }, 

    onwelcome: function() { $('#container-main').html(Template.message(
          { title: "", 
            paragraphs: [
                "<h3>Instructions</h3>",
                "We will show you a set of icons, and your task is to detect if there are duplicates.",
                "Click or Press <a class=\"btn btn-inverse disabled\">J</a> if there is a duplicate.",
                "Click or Press <a class=\"btn btn-inverse disabled\">space</a> if no duplicates are present.",
                "For each correct question you receive <a class=\"btn btn-success disabled\">$0.01</a> bonus.",
                "<hr>",
                "To receive your bonus, click on the <a class=\"btn btn-danger disabled\">Submit</a> button and answer a very short questionnaire before submitting.",
                ]
        })); },


    onleavewelcome: function() {
        $('#nav-welcome').toggleClass('active');
    },


    onprepare: function() {
        $('#nav-experiment').toggleClass('active');
        $('#container-main').html(Template.message(
          { title: "First Task", 
            paragraphs: [
                "",
                "Okay now it is for real. Answer as fast and accurate as possible!",
                "Press <a class=\"btn btn-inverse disabled\">J</a> for a set with a duplicate or press <a class=\"btn btn-inverse disabled\">space</a> if no duplicates are present.",
                ], 
            buttons: [{ 
                label: "Go!",
                class: "btn-primary btn-large",
                onclick: "Application.startExperiment()",
                },],
            }));
        },

    onexperiment: function() {
        this.experiment.start = new Date;
        //this.goFullscreen();
        this.startTaskSet();
        },
 
    ontaskset: function () {
        var TaskSet =  {
            load : function (set) {
                this.set = set;
            },
            dispatch : function () {
                var lefttasks = this.set.tasks.filter(function (el){return (el.result == undefined);});
                if (lefttasks.length > 0) {
                    var tasktodo = lefttasks[Math.floor(Math.random()*lefttasks.length)];
                    var fsm = StateMachine.create(task);
                    fsm.load(tasktodo);
                    var thattaskset = this;
                    fsm.callBack = function () {thattaskset.dispatch()};
                } else {
                    this.callBack();
                }
            },
        };

        var that = this;

        TaskSet.load(this.experiment.sets[this.pointer]);
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
        that = this;
        this.experiment.stop = new Date;
        this.experiment.overallTime = this.experiment.stop - this.experiment.start;
        $.ajax( { url: "https://api.mongolab.com/api/1/databases/moji/collections/"+this.experiment.name+"?apiKey=",
              data: JSON.stringify( this.experiment ),
              type: "POST",
              contentType: "application/json",
              success: function() {
                  $('#container-main').html(Template.message(
                      { title: "Thank you!", 
                        paragraphs: [
                        '',
                        'That was it already, if you have any comments please feel free ...',
                        '<form  action="#" onsubmit="$.ajax( {url: \'https://api.mongolab.com/api/1/databases/moji/collections/feedback?apiKey=\', data: JSON.stringify({feedback: $(\'#comments\').val(), time: new Date(), experiment: \''+that.experiment.name+'\',}), type: \'POST\', contentType: \'application/json\', success:function() {location.reload(true);},});"><textarea class="span8" rows="20" id="comments"></textarea>',
                        '<input id="comments"class="btn" type="submit"></form>',
                        ], 
                      }));},
              error: function() {
                  var data = JSON.stringify( that.experiment );
                  $('#container-main').html(Template.message(
                      { title: "Thank you!", 
                        paragraphs: [
                        "",
                        'There was a probleme with the internet connection. Could you please send me the following data by email to: <a href="mailto:moji.michael@oiu.ch?subject=[Moji Results] '+that.experiment.name+'&body='+escape(data)+'">moji.michael@oiu.ch</a>',
                        '<textarea rows="20" class="span8">'+ data +'</textarea>'
                        ], 
                      }));},
            });
        }, 
    }
});

Application.goFullscreen = function () {
    $('.navbar').hide('fast');
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
    $('.navbar').show('slow');
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

TaskFSM = function () {
    this.load();
}

TaskFSM.prototype = {

    onload: function (event, from, to, msg) {
        this.task = msg;
    },

    onready: function() {
        var that = this;
        $(document).bind("keypress", function(e) {
            if (e.which == 32) {
                e.preventDefault();
                that.set();
            }
        });
        $('#container-main').html(Template.trialmessage("If you are ready, please press <a class=\"btn btn-inverse disabled\">space</a> to start."));
    },

    onleaveready: function () {
        $(document).unbind("keypress");
    },

    oncross: function() {
        var that = this;
        $(document).bind('keypress', function(e) {
            if (e.which == 106) {
                e.preventDefault();
                that.stop(true);
            }
            if (e.which == 32) {
                e.preventDefault();
                that.stop(false);
            }
        });

        // prepare the test by deciding if similar figure is shown and if at which places
        var a,b;
        var amount = this.task.amount;
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
        $('#container-preload').html(Template.trialmessage('<div id="identifiers-preload" class="row" style="display: inline-block;" ></div>'));
        for (var i = 0; i < this.task.amount; i++) {
            var data = ""
            if (a == i || b == i) {
                data = similarData;
            };
            $('#identifiers-preload').append(Template.identicon({ data: data, type: this.task.type}));
        }
        Identicon.init();

        // container gets loaded with counting
        $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkred;"></p>')); 
        //var cross = $('#cross');
        //cross.html('3');
        //setTimeout(function () {cross.html('2'); setTimeout(function () {cross.html('+'); setTimeout(function () {that.start();},1000);}, 1000);},1000);
        that.start();
        
    },

    oncontent: function() {
        $('#container-main').html(Template.trialmessage('<div id="identifiers" class="row" style="display: inline-block;" ></div>'));
        $('#identifiers').replaceWith($('#identifiers-preload'));
        this.timeStart = new Date().getTime();
    },

    onleavecontent: function() {
        $(document).unbind('keypress');
    },
        
    onend: function(event, from, to, msg) {
        var that = this;
        this.task.result = {}
        this.task.result.time = new Date().getTime() - this.timeStart;
        if (this.task.similar == msg) {
            $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkgreen;">Correct, '+this.task.result.time+' ms</p>')); 
            this.task.result.correct = true;
        } else {
            $('#container-main').html(Template.trialmessage('<p id="cross" style="font-family: Arial, Helvetica, sans-serif; font-size: 32px; color: darkred;">Wrong, '+this.task.result.time+' ms</p>')); 
            this.task.result.correct = false;
        }
        setTimeout(function () {that.callBack()}, 1200);
        },
}

var task = {
  target: TaskFSM.prototype,
  initial: "initial",

  events: [
    { name: 'load', from: 'initial', to: 'ready' },
    { name: 'set', from: 'ready', to: 'cross' },
    { name: 'start', from: 'cross', to: 'content' },
    { name: 'stop', from: 'content', to: 'end' },
    { name: 'restart', from: 'end', to: 'ready' }
  ],
};

Application.load({
    name: "experiment_name",
    fullscreen: true,
    sets: [
        {
        name: "set_base",
        tasks: [
        {
            type: 'Figure',
            amount: 6,
        },
        {
            type: 'Minimal',
            amount: 6,
        },
        {
            type: 'Text10',
            amount: 6,
        },
        {
            type: 'Text',
            amount: 6,
        },
    ]},
    {
        name: "set_color",
        tasks: [
        {
            type: 'FigureBW',
            amount: 6,
        },
        {
            type: 'FigureC1',
            amount: 6,
        },
        {
            type: 'FigureC2',
            amount: 6,
        },
        {
            type: 'FigureC3',
            amount: 6,
        },
        {
            type: 'FigureGrey',
            amount: 6,
        },
     ]},
     {
        name: "set_shape",
        tasks: [
        {
            type: 'FigureBlob',
            amount: 6,
        },
        {
            type: 'Moji',
            amount: 6,
        },
        {
            type: 'FigureMoji',
            amount: 6,
        },
        {
            type: 'FigureMoji2',
            amount: 6,
        },
        {
            type: 'FigureTwo',
            amount: 6,
        },
      ]},
      {
        name: "set_validation",
        tasks: [
        {
            type: 'GravIdenticon',
            amount: 6,
        },
        {
            type: 'GravMonsterid',
            amount: 6,
        },
        {
            type: 'GravRetro',
            amount: 6,
        },
        {
            type: 'GravWavatar',
            amount: 6,
        },
        {
            type: 'Robohash',
            amount: 6,
        },
     ]},  
    ],
});
