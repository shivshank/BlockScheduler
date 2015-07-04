"use strict"

tabs.makeEditable = function(element, delegate, inputId, inputClass,
                             onDone, eventType) {
    // this function makes an element editable on click
    // when editing is complete (click off or press enter), it calls
    //   the onDone callback with (originalElement, new text)
    // if delegate is not null, then the handler is attached to element
    //   but only triggered for events on $(delegate) (delegate is a selector)
    
    var handler = function(e) {
        var target = $(e.currentTarget),
            inputBox, parent;
        
        
        inputBox = $("<input>");
        inputBox.attr("type", "text");
        if (inputId) {
            inputBox.attr("id", inputId);
        }
        if (inputClass) {
            inputBox.attr("class", inputClass);
        }
        
        
        /* This would create a form and wrap the inputBox...
            this method would allow pressing enter, even on making no changes
            to the inputBox. Its a consideration.
        // TODO: do something that puts this into scm but out of working dir
        //f = $("<form>");
        
        //inputBox.appendTo(f);
        
        //sub = $("<input type='submit'/>");
        //sub.css("display", "none");
        //sub.appendTo(f);
        */
        
        parent = target.parent();
        // jQuery replaceWith removes all events; we don't want that
        parent[0].replaceChild(inputBox[0], target[0]);
        
        inputBox.val( target.text() );
        inputBox[0].select();
        
        inputBox.on("blur change", function() {
            if (!$.contains(document, inputBox[0])) {
                // if the inputBox has already been removed, then do nothing
                // (use jQuery.contains because of Node.contains support)
                return;
            }
            
            var text = inputBox.val();
            // we do want inputBox to be cleaned up now to avoid memory leaks
            // (this function creates a new input every time)
            inputBox.replaceWith(target);
            onDone(target, text);
        });
    };
    
    if (delegate) {
        $(element).on(eventType || "click", delegate, handler);
    } else {
        $(element).on(eventType || "click", handler);
    }
};

tabs.schedule = {
	div: null
};

tabs.planner = {
    div: null,
};

tabs.settings = {
    init: function(c, s, p) {
        var txt;
        
        $("#s-save-button").click( function() {
            var o = "# lines starting with hash symbols are comments,\n" +
                    "# colons mark fields\n";
            o += s.toDataText();
            o += c.toDataText();
            $("#s-save-text").val(o);
            $("#s-save-text")[0].select();
        });
    }
};

tabs.calendar = {
    div: null,
    dayTypeSelector: null,
    toolTipFormat: null,
    createYear: function(y) {
        var month = 0, day = 1;
        
    },
    init: function(c) {
        $("#calendar-update").click( function(e) {
            c.start = new Date($("#calendar-start-date").val());
            c.end = new Date($("#calendar-end-date").val());
            tabs.switchTo("calendar");
            return false;
        });
        
        $("#calendar-halfday-periods").val("1 2 3");
        $("#calendar-setday-block").val("E");
    },
    load: function(c, s) {
        // remember that Date's month is zero based
        var current = new Date(c.start.getFullYear(), c.start.getMonth(), 1),
            m, year, table, header, div, dow, weeks, block, oldBlock;
        
        $("#calendar-start-date").val(c.formatDate(c.start));
        $("#calendar-end-date").val(c.formatDate(c.end));
        
        this.div.empty();
        this.div.off("click");
        this.div.on("click", ".calendar-day", {calendar: c}, this.eventHandler);
        
        this.dayTypeSelector.off("change");
        this.dayTypeSelector.on("change", "input", this.cpTooltipEvent);
        
        $("#" + tabs.calendar.toolTipFormat + "-" + this.getDayType()).show();
        
        dow = $("<tr><td>M</td><td>T</td><td>W</td><td>H</td><td>F</td></tr>");
        while (current.getTime() < c.end.getTime()) {
            // for each month of the school year
            m = current.getMonth();
            year = current.getFullYear();
            header = day.months[m] + " " + year;
            
            header = $("<h2>").text(header);
            div = $("<div>").addClass("calendar-month").append(header);
            this.div.append(div);
            
            table = tableGrid.create(5);
            
            // this counts placeholder days as "days of the month"
            weeks = new Date(year, m, 1).getDay();
            weeks += new Date(year, m+1, 0).getDate();
            weeks = Math.ceil(weeks / 7);
            table.makeUniform(weeks);
            table.getHead().append(dow.clone());
            div.append(table.getTable());
            
            table.forEachCell(function(cell, row, x, y) {
                // add this for event handling purposes
                cell.addClass("calendar-day");

                var d = day.fromGrid(year, m, x, y, true), halfDay;
                
                if (d.getMonth() != m) {
                    cell.addClass("placeholder");
                    return;
                }
                
                block = getBlockDay(c, s, d);
                if (c.isDay(c.SET_DAY, d)) {
                    cell.addClass("set-day");
                    cell.text(block);
                } else if (c.isDay(c.NO_SCHOOL, d)) {
                    cell.addClass("no-school");
                } else if (!c.isSchoolDay(d)) {
                    // if not a NO_SCHOOL day, then this day is off the calendar
                    cell.addClass("no-school");
                } else if (c.isDay(c.NO_CLASS, d)) {
                    cell.addClass("no-class");
                    cell.text(block);
                } else if (halfDay = c.isDay(c.HALF_DAY, d)) {
                    cell.addClass("half-day");
                    cell.text(block + ": " + halfDay.periods);
                } else {
                    cell.text(block);
                }
                
                $("<span>").prependTo(cell).text(d.getDate()).addClass("date");
                cell.wrapInner("<div class='calendar-day-div'></div>");
                cell.attr("data-year", d.getFullYear());
                cell.attr("data-month", d.getMonth());
                cell.attr("data-date", d.getDate());
            });
            
            // go to the next month
            current = new Date(year, m + 1, 1);
        }
    },
    getDayType: function() {
        var c = this.dayTypeSelector.children(),
            i, dayType = "erase";
        
        for (i=0; i < c.length; i += 1) {
            if (c[i].nodeName.toLowerCase() != "input") {
                continue;
            }
            
            if (c[i].checked) {
                dayType = c[i].id.split("-");
                dayType = dayType[dayType.length - 1];
                break;
            }
        }
        
        return dayType;
    },
    eventHandler: function(e) {
        // use currentTarget because this handler uses event delegation
        var target = $(e.currentTarget),
            calendar = e.data.calendar,
            date, meta;
        
        if (!target.hasClass("calendar-day")) {
            return;
        }
        
        date = new Date(target.attr("data-year"), target.attr("data-month"),
                        target.attr("data-date"));
        
        switch(tabs.calendar.getDayType()) {
            case "erase":
                calendar.eraseDay(date);
                break;
            case "holiday":
                calendar.setDay(calendar.NO_SCHOOL, date);
                break;
            case "set":
                meta = $("#calendar-setday-block").val().trim()
                calendar.setDay(calendar.SET_DAY, day(date, {block: meta}));
                break;
            case "half":
                meta = $("#calendar-halfday-periods").val().trim().split(" ");
                console.log(meta);
                calendar.setDay(calendar.HALF_DAY, day(date, {periods: meta}));
                break;
            case "noclass":
                calendar.setDay(calendar.NO_CLASS, date);
                break;
            default:
                console.log("error: unknown day type selected");
        }
        
        tabs.switchTo("calendar");
    },
    cpTooltipEvent: function(e) {
        var day = $(e.currentTarget).prop("id").split("-");
        day = day[day.length - 1];
        
        // hide all other tips
        $("." + tabs.calendar.toolTipFormat).hide();
        
        // unhide this tip
        $("#" + tabs.calendar.toolTipFormat + "-" + day).show();
    }
};