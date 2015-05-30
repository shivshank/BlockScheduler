(function(m, $, undefined) {
    var options = {
        useAnim: true
    };
    m.options = options;
    
    var state = {
        defaultTab: "about",
        activeTab: null,
        tabs: [],
        // sections not yet scheduled but added to the class lsit
        preps: [],
        style: null,
        sections: null,
        skipWeekends: true
    };
    m.state = state;
    
    // REFACTOR: Just add data-day and data-period attributes to td...
    var getPrepIndex = function(day, period) {
        return day * params.periods + period;
    };
    
    var prepIndexToBlock = function(index) {
        return {day: Math.floor(index / params.periods),
                period: index % params.periods};
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
    
    var scheduleTableEvent = function(e) {
        var i, t = $(e.target);
        
        if (t.is(":first-child") || t.parent().prop("tagName") === "THEAD"
                                                || t.prop("tagName") !== "TD") {
            // if the selected element is first in the row, do nothing
            // or if element is in first row
            return;
        }
        e.preventDefault();
        
        i = parseInt(t.attr("data-section"), 10) || 0;
        // increment i and wrap on overflow
        i = (i + 1) % (state.preps.length + 1);
        t.attr("data-section", i);
        if (i > 0) {
            t.text(state.preps[i - 1]);
        } else {
            // 0 represents no section this period
            t.text("");
        }
    };
    
    var scheduleAddSectionEvent = function(e) {
        // assume element with event is a <tr>
        var div, i, plus, preps = state.preps;
        
        if ($(document.activeElement).parent().parent()[0] === this) {
            // do nothing if currently adding a class
            return;
        }
        
        if (e.target.tagName.toLowerCase() === "td"
                                                && $(e.target).text() !== "+") {
            // if selected is not add new +, it must be deleted
            $(e.target).remove();
            // remove this section from the preps list
            preps.splice(preps.indexOf($(e.target).text()), 1);
            return;
        }
        
        plus = $(e.target);
        plus.detach();
        
        div = $("<td>");
        div.appendTo( this );
        
        i = $("<input>", {"type": "text"});
        i.appendTo(div);
        i.focus();
        i.blur( function() {
            if (i.val() === "") {
                i.parent().remove();
                return;
            }
            
            i.parent().text(i.val());
            preps.push(i.val());
            i.remove();
        });
        
        plus.appendTo($(this));
    };
    
    /* The div to place the table/generated content into */
    m.generateScheduleTab = function(div) {
        var table, thead, tbody, row, td,
            classList,
            i, j;
        
        div = $(div);
        
        div.empty();
        
        // create the class list
        classList = $("<ul>", {"class": "class-list"});
        div.append(classList);
        classList.append( $("<li>").append( $("<span>").text("+") ) );
        
        // attach the event handler
        classList.click( scheduleAddSectionEvent );
        
        // create the schedule table
        table = $("<table>", {"class": "teacher-schedule"});
        div.append(table);
        
        thead = $("<thead>");
        table.append(thead);
        
        tbody = $("<tbody>", {"id": "teacher-schedule"});
        table.append(tbody);
        
        // build the header
        for (i=0; i < params.blocks.length + 1; i+=1) {
            td = $("<td>");
            if (i > 0) {
                // fill in the header with each block
                td.text(params.blocks[i-1]);
            }
            thead.append(td);
        }
        
        
        // build the tbody; for each period
        for (i=0; i < params.periods; i+=1) {
            row = $("<tr>");
            tbody.append(row);
            // build the row, td for each day
            for (j=0; j < params.blocks.length + 1; j+=1) {
                td = $("<td>");
                row.append(td);
                if (j > 0) {
                    td.attr("data-section", "0");
                    td.attr("data-index", getPrepIndex(j-1, i).toString());
                } else {
                    td.text(i + 1);
                }
            }
        }
        
        // attach the event handler
        table.click( m.scheduleTableEvent );
    };
    
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
    };
    
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

$(document).ready( function() {
    program.loadState(program_save);
    
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
    program.generateScheduleTab($("#schedule-table"));
    
    // on click of the planner button, generate the main schedule
    $("#planner-button").click( function() {
        /*
        program.readSchedule($("#teacher-schedule"));
        */
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
                program.generateScheduleTab($("#schedule-table"));
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