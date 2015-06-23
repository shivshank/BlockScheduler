(function(m, $, undefined) {
    var options = {
        useAnim: true
    };
    m.options = options;
    
    var state = {
        saving: true,
        defaultTab: "about",
        activeTab: null,
        tabs: [],
        // sections not yet scheduled but added to the class lsit
        preps: [],
        style: {},
        sections: [],
        skipWeekends: true
    };
    m.state = state;
    
    /*
    // REFACTOR: Just add data-day and data-period attributes to td...
    var getPrepIndex = function(day, period) {
        return day * params.periods + period;
    };
    
    var prepIndexToBlock = function(index) {
        return {day: Math.floor(index / params.periods),
                period: index % params.periods};
    };
    */
    m.getSection = function(block, period) {
        block = params.reverser[block];
        var s = Object.keys(state.sections);
        var r = null;
        s.forEach( function(i) {
            if (state.sections[i].period === period
                           && state.sections[i].on_days.indexOf(block) !== -1) {
                r = state.sections[i];
            }
        });
        return r;
    };
    m.needSection = function(name, period) {
        var r = true;
        state.sections.forEach( function(i) {
            if (i.name === name && i.period === period) {
                r = false;
            }
        });
        
        return r;
    };
    m.findSection = function(name, period) {
        var r = null;
        state.sections.forEach( function(i) {
            if (i.name === name && i.period === period) {
                r = i;
            }
        });
        
        return r;
    };
    m.removeSection = function(block, period) {
        var s = m.getSection(block, period);
        
        if (s === null) {
            return;
        }
        
        Section.prototype.removeBlock.call(s, params.reverser[block]);
        if (s.on_days.length === 0) {
            state.sections.splice(state.sections.indexOf(s), 1);
        }
    };
    m.setSection = function(name, block, period) {
        var s = m.getSection(block, period);
        if (s && s.name !== name) {
            // remove previous prep
            m.removeSection(block, period);
        }
        
        // if we need to add a section for prep on this period
        s = m.findSection(name, period);
        if (s === null) {
            s = new Section(name, period, []);
            state.sections.push( s );
        }
        
        if (s.name === name && s.on_days.indexOf(params.reverser[block]) === -1) {
            s.on_days.push(params.reverser[block]);
        }
    };
    
    m.switchTo = function(t) {
        // update buttons
        $("#" + t + "-button").toggleClass("tab-selected");

        $("#" + state.activeTab + "-button").toggleClass("tab-selected");
        
        // update actual areas
        if (options.useAnim && state.activeTab) {
            $("#" + state.activeTab).slideUp(200, "linear",
                                         function() { $("#" + t).slideDown() });
        } else if (options.useAnim) {
            $("#" + t).slideDown();
        } else {
            // this can fail semi-gracefully by looking for element "#null"
            $("#" + state.activeTab).hide();
            $("#" + t).show();
        }
        state.activeTab = t;
    };
    
    m.tabEvent = function(e) {
        // if [this].[id] === [something]-button, switch to element [something]
        var tab = $(e.target).attr("id").toLowerCase();
        tab = tab.replace("-button", "");
        
        if (state.activeTab === tab) {
            m.switchTo(state.defaultTab);
        } else {
            m.switchTo(tab);
        }
    };
    
    m.classListEvent = function(e) {
        if (!$(e.target).is("#class-list li")) {
            $(e.target).parent().trigger("click");
            return;
        }
        
        var t = $(e.target);
        t.parent().find(".selected").removeClass("selected");
        
        t.addClass("selected");
        
        $("#prep-styler-div").slideDown();
        $("#prep-styler").val( state.style[t.attr("data-prep")] || "white" );
        $("#prep-styler").attr("data-prep", t.attr("data-prep"));
    };
    
    var clickTableEvent = function(e) {
        if (!$(e.target).is("#teacher-schedule tbody td:not(:first-child)")) {
            $(e.target).parent().trigger("click");
            return;
        }
        var prep = $("#class-list").find(".selected");
        var period, block, s;
        
        if (prep.length === 0) {
            return;
        }
        
        prep = prep.eq(0).attr("data-prep");
        $(e.target).attr("data-prep", state.preps.indexOf(prep)).text(prep);
        
        block = $(e.target).attr("data-block");
        period = parseInt($(e.target).attr("data-period"), 10);
        m.setSection(prep, block, period);
    };
    
    m.generateScheduleTab = function() {
        "use_strict";
        var prepList = $("#class-list"),
            div = $("#teacher-schedule-div"),
            table, thead, tbody, row, td, i, styler = $("#prep-styler-div");
        prepList.empty();
        
        div.empty();
        
        styler.hide();
        
        // fill in the list with each prep
        state.preps.forEach( function(v) {
            i = $("<li>");
            i.attr("data-prep", v);
            $("<span>").text(v).appendTo(i);
            
            prepList.append( i );
        });
        
        // attach create handler
        $("#class-list-add-new").click( function() {
            var l = $("<li>");
            l.appendTo(prepList);
            
            var i = $("<input>", {"type": "text"});
            i.appendTo(l);
            i.focus();
            i.blur( function() {
                var newPrep = i.val();
                if (newPrep === "") {
                    // remove the list item if the person did nothing
                    i.parent().remove();
                    return;
                }
                // otherwise add the new prep and remove the input
                i.parent().append( $("<span>").text(newPrep) );
                i.parent().attr("data-prep", newPrep);
                state.preps.push(newPrep);
                i.remove();
            });
        });
        
        // attach delete handler
        $("#class-list-remove-selected").click( function() {
            var s = $("#class-list").find(".selected");
            state.preps.splice(
                             state.preps.indexOf(s.eq(0).attr("data-prep")), 1);
            s.remove();
        });
        
        table = $("<table>", {"id": "teacher-schedule"});
        div.append(table);
        
        thead = $("<thead>");
        table.append(thead);
        tbody = $("<tbody>");
        table.append(tbody);
        
        // attach event handlers
        table.click( clickTableEvent );
        table.on("contextmenu", function(e) {
            var r, t = $(e.target);
            
            e.preventDefault();
            if (t.is("#teacher-schedule tbody td:not(:first-child)")){
                // right mouse button was pressed
                m.removeSection(t.attr("data-block"),
                                parseInt(t.attr("data-period"), 10));
                t.attr("data-prep", "").text("");
            } else {
                $(e.target).parent().trigger("mousedown");
            }
        });
        
        row = $("<tr>");
        row.appendTo(thead);
        // append a place holder for the first column
        row.append($("<td>"));
        // load in the blocks and fill the header
        params.blocks.forEach( function(v) {
            row.append( $("<td>").text(v) );
        });
        
        // build the table and fill it with sections
        for (i=0; i < params.periods; i+=1) {
            row = $("<tr>");
            row.appendTo(tbody);
            
            // append the period number
            row.append($("<td>").text(i+1));
            
            params.blocks.forEach( function(b) {
                td = $("<td>");
                td.appendTo(row);
                td.attr("data-block", b);
                td.attr("data-period", i+1);
                td.attr("data-prep", "");
                var r = m.getSection(b, i+1);
                if (r) {
                    td.text(r.name)
                    td.attr("data-prep", r.name);
                }
            });
        
        }
    };
    
    /*
    var readScheduleRow = function(row) {
        var sections = {}, period, day, prep;
        row = $(row).children().slice(1);
        period = prepIndexToBlock(row.eq(0).attr("data-index")).period;
        
        row.each( function(i, v) {
            day = prepIndexToBlock($(v).attr("data-index")).day;
            prep = parseInt( $(v).attr("data-section"), 10 );
            if (prep !== 0 && sections[state.preps[prep-1]]) {
                sections[state.preps[prep-1]].push(day);
            } else if (prep !== 0) {
                sections[state.preps[prep-1]] = [day];
            }
        });
        
        sections = Object.keys(sections).map( function(k) {
            return new Section(k, period, sections[k]);
        });
        return sections;
    };
    
    m.readSchedule = function(tbody) {
        // load sections into a list (where name is the class list index)
        
        tbody = $(tbody);
        var rows = tbody.children(), period, j, items;
        var sections = [];
        var sectionsInRow;
        var ds;
        
        rows.each( function(i, v) {
            // extend sections with the returned list
            Array.prototype.push.apply(sections, readScheduleRow(v));
        });
        
        state.sections = sections;
    };*/
    
    var loadCalendar = function(calendarObject) {
        var t = calendarObject,
            o = {},
            convert = function(i) {return day(i.date, i);};
        o.no_school = t.no_school.map(convert);
        o.no_session = t.no_session.map(convert);
        o.set_day = t.set_day.map(convert);
        o.half_day = t.half_day.map(convert);
        
        params.calendar = o;
    };
    m.loadCalendar = loadCalendar;
    
    var saveCalendar = function() {
        var o = {},
            convert = function(i) {return {date: formatDate(i),
                                           block: i.block,
                                           attendence: i.attendence,
                                           classes: i.classes,
                                           tags: i.tags};};
        
        Object.keys(params.calendar).forEach( function(v) {
            o[v] = [];
            
            params.calendar[v].forEach( function(d) {
                o[v].push( convert(d) );
            })
        });
        
        return o;
    };
    
    m.saveState = function() {
        var o = {};
        o.sections = state.sections;
        o.calendar = saveCalendar(params.calendar);
        o.preps = state.preps;
        o.style = state.style;
        return o;
    };
    
    m.loadState = function(saveObject) {
        loadCalendar(saveObject.calendar);
        state.sections = saveObject.sections;
        state.preps = saveObject.preps;
        state.style = saveObject.style;
    };
}(window.program = window.program || {}, jQuery));

var formatDate = function(d){
    var months = ["January", "February", "March", "April", "May",
                  "June", "July", "August", "September", "October",
                  "November", "December"];
    return months[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();
};

var save = function() {
    if (window.localStorage && program.state.saving === true) {
        localStorage["shivshank.bs.OLD-SAVE"] = JSON.stringify(
                                                           program.saveState());
        return true;
    } else {
        return false;
    }
};

$(window).unload( function(e) {
    if (!save()) {
        return "Your changes will not be saved! Continue?";
    }
});

$(window).on('message', function(e) {
    // jquery doesn't support post message?
    var data = e.originalEvent.data;
    console.log("info: received data from server");
    program.loadCalendar(JSON.parse(data));
});

$(document).ready( function() {
    if (!window.localStorage) {
        alert("You need to update your browser " +
              "if you want to save your changes.");
    }
    
    // load any locally saved calendar or schedule
    if (window.localStorage && localStorage["shivshank.bs.OLD-SAVE"]) {
        program.loadState(JSON.parse(localStorage["shivshank.bs.OLD-SAVE"]));
    }
    
    // try to load a calendar from the server
    $.get( "school.txt", function(data) {
        // use getJSON maybe instead?
        window.thatdata = data;
        program.loadCalendar(JSON.parse(data));
    }, "text");
    
    // create buttons and initialize them
    var tab_target = $("#tab-header"),
        n, attr, i;

    // convert each main div into a selectable button
    $("#tabs").children().each( function() {
        n = $(this).attr("id");
        program.state.tabs.push(n);
        $(this).hide();
        n = n.charAt(0).toUpperCase() + n.slice(1);
        attr = {"class": "tab-selector", "id": n.toLowerCase() + "-button"};
        n = $("<div>", attr).text($(this).attr("data-name"));
        n.click(program.tabEvent);
        tab_target.append(n);
    });
    
    program.switchTo(program.state.defaultTab);
    
    $("#class-list").click( program.classListEvent );
    $("#schedule-button").click( function() {
        program.generateScheduleTab();
    });
    $("#prep-styler").blur( function() {
        program.state.style[$(this).attr("data-prep")] = $(this).val();
    });
    
    // on click of the planner button, generate the main schedule
    $("#planner-button").click( function() {
        program.state.sections.forEach( function(i) {
            if (program.state.style[i.name]) {
                i.css = {backgroundColor: program.state.style[i.name]};
            }
        });
        save();
        
        $("#planner").empty();
        createCalendar($("#planner")[0], program.state.sections,
                       program.state.skipWeekends);
    });
    
    // helper function for settings page
    //   (sets property of object to value on change)
    var simpleSetting = function(selector, object, property, reset) {
        // attach a default event
        $(selector).change( function() {
            var i;
            
            // if it can be converted to a number
            if (i = parseInt($(this).val(), 10)) {
                object[property] = i;
            } else {
                object[property] = $(this).val();
            }
            
            if (reset) {
                // do we need to wipe any data?
            }
        });
        // asign the default value
        $(selector).val(object[property]);        
    };
    
    simpleSetting("#s-periods", params, "periods", true);
    simpleSetting("#s-p-length", params, "period_length", false);
    $("#s-blocks").val(params.blocks.join(" ")).change(function() {
        params.blocks = $(this).val().split(" ");
        params.max_block = params.blocks[params.blocks.length-1];
        params.start_block = params.block[0];
        params.getReverser();
        program.generateScheduleTab($("#schedule-table"));
    });
    $("#s-start-day").val(formatDate(params.start));
    $("#s-start-day").change( function() {
        params.start = new Date($(this).val())} );
    $("#s-end-day").val(formatDate(params.end));
    $("#s-end-day").change( function() {
        params.end = new Date($(this).val())} );
        
    $("#s-save-button").click( function() {
        $("#s-save-text").val(JSON.stringify(program.saveState(), null, 4));
        $("#s-save-text").focus()[0].select();
    });
});
