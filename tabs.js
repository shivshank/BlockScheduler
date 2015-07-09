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
	tableDiv: null,
    classList: null,
    styler: null,
    radioName: null,
    addButton: null,
    load: function(c, s, p) {
        var table, head, col, preps, i, prepLabel, prepRadio, span;
        this.tableDiv.empty();
        
        table = tableGrid.create(s.days.length + 1);
        // header is separate from body height
        table.makeUniform(s.periods.length);
        table.getTable().appendTo(this.tableDiv);
        
        // head is actually a reference to a tr
        head = $("<tr>").appendTo(table.getHead());
        for (col=0; col < s.days.length + 1; col+=1) {
            // for each col + 1 because the first column is also a header
            if (col > 0) {
                // wrap the text in a span so makeEditable (see loadEvents)
                //   renders the inputBox nicely
                span = $("<span class='schedule-day'>").text(s.days[col - 1]);
                head.append( $("<td>").append(span).attr(
                                                 "data-day", s.days[col - 1]) );
            } else {
                head.append( $("<td>") );
            }
        }
        
        // fill in the table
        table.forEachCell(function(cell, row, x, y) {
            var period = s.periods[y], day,
                block;
            
            if (x > 0) {
                day = s.days[x-1];
                block = s.getBlock(day, period);
                if (block) {
                    cell.attr("data-class", block.name);
                    cell.text(block.name);
                    if (block.meta.style) {
                        cell.css(block.meta.style);
                    }
                }
                cell.attr("data-period", period);
                cell.attr("data-day", day);
            } else {
                cell.attr("data-period", period);
                // wrap the text in a span so makeEditable (see loadEvents)
                //   renders the inputBox nicely
                cell.append($("<span class='schedule-period'>").text(period));
            }
        });

        preps = s.getPreps();
        this.classList.empty();
        for (i=0; i < preps.length; i+=1) {
            prepRadio = $("<input>").attr("type", "radio")
                                    .attr("id", "schedule-class-" + i)
                                    .attr("name", "schedule-class")
                                    .attr("data-class", preps[i]);

            prepLabel = $("<label>").attr("for", "schedule-class-" + i)
                                    .text(preps[i]);

            this.classList.append(prepRadio);
            this.classList.append(prepLabel);
        }
        
        this.loadEvents(table, s);
    },
    periodEditor: function(span, txt) {
        var td = span.parent();
        
        txt = txt.trim();
        if (txt === "") {
            program.schedule.removePeriod(td.attr("data-period"));
            // remove the tr parent of td
            td.parent().remove();
            return;
        }
        
        // update the schedule (td still holds old period)
        program.schedule.renamePeriod(td.attr("data-period"), txt);
        
        // update the view/ui (span holds text, td holds meta)
        td.attr("data-period", txt);
        span.text(txt);

        // for each cell in the row
        while ((td = td.next()) && td.length > 0) {
            td.attr("data-period", txt);
        }
    },
    dayEditor: function(span, txt) {
        var td = span.parent(),
                 table = td.parent().parent().parent(), // td < tr < thead < table
                 col = table.find("td[data-day=" + td.attr("data-day") + "]");

        txt = txt.trim();
        if (txt === "") {
            program.schedule.removeDay(td.attr("data-day"));
            col.remove();
            return;
        }
        
        // update the schedule (td still holds old period)
        program.schedule.renameDay(td.attr("data-day"), txt);
        
        // update the view/ui (span holds text, td holds meta)
        td.attr("data-day", txt);
        span.text(txt);
        
        col.attr("data-day", txt);
    },
    loadEvents: function(tableGrid, s) {
        // attach editing handlers
        // for period
        tabs.makeEditable(tableGrid.getBody(), ".schedule-period", null,
                        "schedule-table-input", this.periodEditor, "dblclick");
        // for day
        tabs.makeEditable(tableGrid.getHead(), ".schedule-day", null,
                        "schedule-table-input", this.dayEditor, "dblclick");
                        
        // event handler for each cell in the table (excluding period headers)
        tableGrid.getBody().on("click", "td:not(:first-child)", function(e) {
            var section = tabs.schedule.getSelectedClass(),
                target = $(e.currentTarget),
                day = target.attr("data-day"),
                period = target.attr("data-period");

            if (!section) {
                return;
            }
            
            if (section === "Eraser") {
                s.removeBlock(day, period);
                target.text("");
                target.attr("data-class", "");
                return;
            }
            
            s.setBlock(day, period, section);
            target.text(section);
            target.attr("data-class", section)
        });
        
        // class list add event
        // (any unused classes will disappear on reload, see this.load)
        this.addButton.click( function() {
            var field = $("<input>");
            field.attr("type", "text");
            field.addClass("schedule-class-input");
            field.appendTo( tabs.schedule.classList );
            field.select();
            
            field.on("blur change", function() {
                var prep, label, radio;
                
                if (!$.contains(document, field[0])) {
                    // field has already been removed, do nothing
                    return;
                }
                
                prep = field.val().trim();
                field.remove();
                
                if (prep === "") {
                    return;
                }
                
                radio = $("<input>").attr("type", "radio")
                                    .attr("name", "schedule-class")
                                    .attr("id", "schedule-class-" + prep)
                                    .attr("data-class", prep);

                label = $("<label>").attr("for", "schedule-class-" + prep)
                                    .text(prep);
                
                radio.appendTo(tabs.schedule.classList);
                label.appendTo(tabs.schedule.classList);
                radio.attr("checked", "checked");
                radio.trigger("click");
            });
        });
    },
    getSelectedClass: function() {
        return $("input[name=schedule-class]:checked").attr("data-class");
    }
};

tabs.planner = {
    div: null,
    generateDay: function(element, date, c, s, p) {
        var block = getBlockDay(c, s, date),
            container,
            item, day, i, half;
        
        element.append( $("<h1>").text("" + date.getDate() + " " + block) );
        
        if (c.isDay(c.NO_CLASS, date)) {
            return;
        }
        
        container = $("<div>");
        container.appendTo(element);
        
        day = s.getDay(block);
        
        // TODO: Optimize Half day code...
        if (half = c.isDay(c.HALF_DAY, date)) {
            half = half.periods.map(function(i) {return s.periods.indexOf(i);});
        } else {
            half = [];
        }
        
        for (i=0; i < day.length; i+=1) {
            // empty periods could be cached
            if (!p.planner.keepEmpty && s.isEmptyPeriod(s.periods[i])) {
                continue;
            }

            item = $("<div>").addClass("planner-period");
            item.appendTo(container);
            if (half.length > 0 && half.indexOf(i) === -1) {
                // this period is not empty but it IS a half day
                // continue before adding anything else
                continue;
            }
            
            if (p.planner.showPeriod) {
                item.append( $("<span>").text(s.periods[i]).addClass("num") );
            }
            
            if (day[i]) {
                item.append( $("<span>").text(day[i].name) );
                if (day[i].meta.style) {
                    item.css(day[i].meta.style);
                }
            }
        }
    },
    generateMonth: function(div, date, omitWeekends, c, s, p) {
        var table, weeks, head, dow;
        
        // append header
        div.append($("<h1>").text(
                       day.months[date.getMonth()] + " " + date.getFullYear()));

        // create the table
        if (omitWeekends) {
            table = tableGrid.create(5);
        } else {
            table = tableGrid.create(7);
        }
        
        date = new Date(date.getFullYear(), date.getMonth(), 1);
        
        // format the table with the correct number of weeks
        weeks = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
        weeks = Math.ceil(weeks / 7);
        table.makeUniform(weeks);
        table.getTable().appendTo(div);
        
        // head is actually the tr
        head = $("<tr>").appendTo(table.getHead());
        // fill in the days of the week header
        dow = "Monday Tuesday Wednesday Thursday Friday";
        dow = omitWeekends? dow : "Sunday " + dow + " Saturday";
        // turn this list into tds with each items text and append to head
        dow.split(" ").forEach(function(i){ head.append($("<td>").text(i)); });

        table.forEachCell( function(cell, row, x, y) {
            var d = day.fromGrid(date.getFullYear(), date.getMonth(),
                                                            x, y, omitWeekends);
            if (d.getMonth() !== date.getMonth()) {
                cell.addClass("placeholder");
                return;
            }
            if (!c.isSchoolDay(d)) {
                cell.addClass("no-school");
                return;
            }
            
            tabs.planner.generateDay(cell, d, c, s, p);
        });
    },
    load: function(c, s, p) {
        // TODO: Add support for different planners
        // (lesson plans, yearly, weekly, per class)
        var date = new Date(c.start),
            div;
        
        this.div.empty();
        while (date.getTime() < c.end.getTime()) {
            div = $("<div>").addClass("planner-month").appendTo(this.div);
            this.generateMonth(div, date, true, c, s, p);
            date.setMonth(date.getMonth() + 1);
        }
    }
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
        
        $("#s-saving").prop("checked", p.saving);
        $("#s-saving").change( function(e) {
            p.saving = e.target.checked;
        });
        
        $("#s-erase-schedule").click( function(e) {
            if (p.saving && localStorage && localStorage.removeItem) {
                localStorage.removeItem(p.save.schedule);
            }
            p.undo.schedule = p.schedule;
            p.schedule = new Schedule(["A"], ["1"]);
        });
        
        $("#s-erase-calendar").click( function(e) {
            if (p.saving && localStorage && localStorage.removeItem) {
                localStorage.removeItem(p.save.calendar);
            }
            p.undo.calendar = p.calendar;
            p.calendar = new Calendar(
                            new Date("August 1 " + new Date().getFullYear()),
                            new Date("June 1 " + (new Date().getFullYear()+1)));
        });
        
        $("#s-load-calendar").click( function(e) {
            if (p.undo.calendar) {
                p.calendar = p.undo.calendar;
            }
        });
        
        $("#s-load-schedule").click( function(e) {
            if (p.undo.schedule) {
                p.schedule = p.undo.schedule;
            }
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
        
        $("#calendar-refresh").click( function(e) {
            program.saving = true;
            if (localStorage && localStorage.removeItem) {
                localStorage.removeItem(program.save.calendar);
            }
            program.saving = false;
            window.location.hash = "#about";
            window.location.reload();
        });
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