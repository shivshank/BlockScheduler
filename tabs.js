"use strict"

tabs.createForm = function(inputAttr) {
    var i;

    i = $("<input>");
    i.attr("type", "text");
    i.attr(inputAttr || {});

    return i;
};

tabs.editHandler = function(inputAttr, onDone) {
    // this function creates an input handler that replaces the target element
    // with an input element (actually a hidden form with visible input[text]).
    // When the input is unfocused or edited (on blur and change), the onDone
    // callback is invoked with ($(target), inputVal)
    var handler = function(e) {
        var target = $(e.currentTarget), input, parent;

        input = tabs.createForm(inputAttr);

        parent = target.parent();
        // jQuery replaceWith removes all events; we don't want that
        parent[0].replaceChild(input[0], target[0]);

        input.val( target.text() );
        input.select();

        input.on("blur change", function() {
            if (!$.contains(document, input[0])) {
                // if the input form has already been removed, then do nothing
                // (use jQuery.contains because of Node.contains support)
                return;
            }

            var text = input.val();
            // use jQuery replaceWith so the form is properly cleaned up
            input.replaceWith(target);
            onDone(target, text);
        });
    };

    return handler;
};

tabs.schedule = {
	tableDiv: null,
    classList: null,
    styler: null,
    radioName: null,
    addButton: null,
    actionModeName: null,
    quickstyles: null,
    quickstyleName: null,
    init: function() {
        var s;

        // apply data style of input element to adjacent label element
        $("#" + this.actionModeName + "-classes").prop("checked", true);

        this.quickstyles.children().each( function(i, v) {
            v = $(v);
            if (v.attr("data-style")) {
                // if the element has data-style attribute, store it
                s = v.attr("data-style");
            } else {
                // apply the last stored style
                v.css(JSON.parse(s));
            }
        });
    },
    addButtons: function(tablegrid) {
        var parent, td;
        // assign td to the very first td in the head
        td = tablegrid.getHead().find("td:first-child").eq(0);
        // day buttons
        td.append( $("<div>").attr("id", "schedule-remove-day")
                             .addClass("remove")
                             .text("-") );
        td.append( $("<div>").attr("id", "schedule-add-day")
                             .addClass("add") );
        // period buttons
        td.append( $("<div>").attr("id", "schedule-remove-period")
                             .addClass("remove")
                             .text("-") );
        td.append( $("<div>").attr("id", "schedule-add-period")
                             .addClass("add") );
    },
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
                // wrap the text in a span for editHandler (see loadEvents)
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
                // wrap the text in a span for editHandler (see loadEvents)
                //   renders the inputBox nicely
                cell.append($("<span class='schedule-period'>").text(period));
            }
        });

        // add the day/period add/remove buttons
        this.addButtons(table);

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
        if (txt === "" || program.schedule.periods.indexOf(txt) !== -1) {
            // if the user entered nothing or this period already exists
            if (!td.attr("data-period")) {
                // the period wasn't created yet, remove the row
                td.parent().remove();
            }
            // do nothing
            return;
        }

        // update the schedule (td still holds old period)
        if (program.schedule.periods.indexOf(td.attr("data-period")) !== -1) {
            program.schedule.renamePeriod(td.attr("data-period"), txt);
        } else {
            // period doesn't exist yet
            program.schedule.addPeriod(txt);
        }

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
            col = table.find("td:nth-child(" + (td.index() + 1) + ")");

        txt = txt.trim();
        if (txt === "" || program.schedule.days.indexOf(txt) !== -1) {
            // if the user entered nothing or this day already exists
            if (!td.attr("data-day")) {
                // the day wasn't created yet, remove the column
                col.remove();
            }
            // do nothing
            return;
        }

        // update the schedule (td still holds old period)
        if (program.schedule.days.indexOf(td.attr("data-day")) !== -1) {
            program.schedule.renameDay(td.attr("data-day"), txt);
        } else {
            program.schedule.addDay(txt);
        }

        // update the view/ui (span holds text, td holds meta)
        td.attr("data-day", txt);
        span.text(txt);

        col.attr("data-day", txt);
    },
    classEditor: function(label, txt) {
        var radio = label.prev(),
            old = radio.attr("data-class"),
            section = txt.trim().replace(/(\'|\\)/g, "").replace(),
            // if section contains CSS syntax, this will break, so use id num
            relevant = tabs.schedule.tableDiv.find(
                                              "td[data-class='" + old + "']"),
            selector = tabs.schedule.classList.selector + " " +
                       "input[type='radio'][data-class='" + section + "']";

        if (section === "" || $(selector).length) {
            // if user entered nothing or a class with this name exists already
            $(selector).prop("checked", "checked"); // select that radio!
            radio.remove();
            label.remove();
            if (old) {
                relevant.text("").removeAttr("data-class");
                program.schedule.removeSection(old);
            }
            return;
        }

        radio.attr("data-class", section);
        radio.prop("checked", "checked");

        relevant.text(section).attr("data-class", section);
        label.text(section);
        program.schedule.renameSection(old, section);
    },
    scheduleEditor: function(e) {
        var tr, col, i, span, s = program.schedule;

        switch (e.target.id) {
        case "schedule-add-day":
            // add the column
            col = tabs.schedule.tableDiv.find("tbody tr");
            for (i=0; i < col.length; i+= 1) {
                col.eq(i).append( $("<td>").attr("data-period", s.periods[i]) );
            }
            // create the header and invoke the edit callback
            tabs.schedule.tableDiv.find("thead tr:last-child").append("<td>");
            span = $("<span>").addClass("schedule-day");
            span.appendTo(tabs.schedule.tableDiv.find("thead td:last-child"));
            span.trigger("dblclick");
            break;
        case "schedule-remove-day":
            if (s.days.length > 1) {
                tabs.schedule.tableDiv.find("td:last-child").remove();
                s.removeDay(s.days[s.days.length - 1]);
            }
            break;
        case "schedule-add-period":
            // add the row
            tr = $("<tr>");
            tabs.schedule.tableDiv.find("tbody").eq(0).append(tr);
            for (i=0; i < s.days.length + 1; i+=1) {
                // should fail gracefully for s.days[-1] -> null
                tr.append($("<td>").attr("data-day", s.days[i-1]));
            }
            // create the row header and invoke the edit callback
            span = $("<span>").addClass("schedule-period");
            span.appendTo(tr.children().eq(0));
            span.trigger("dblclick");
            break;
        case "schedule-remove-period":
            if (s.periods.length > 1) {
                tabs.schedule.tableDiv.find("tbody tr:last-child").remove();
                s.removePeriod(s.periods[s.periods.length - 1]);
            }
            break;
        default:
            // do nothing
            break;
        }
    },
    setCellStyle: function(s, target, day, period) {
        var c = this.getSelectedStyle(),
            section = s.getBlock(day, period);

        if (!section || !c) {
            return;
        }

        // remove the style attribute completely so styles dont "bleed" over
        target.removeAttr("style");

        // erase the style if none is selected
        if (c.name === this.quickstyleName + '-none') {
            s.getBlock(day, period).meta.style = {};
            return;
        }

        // otherwise update the table and the schedule section object
        target.css(c.style);
        section.meta.style = c.style;
    },
    setCellClass: function(s, target, day, period) {
        var section = this.getSelectedClass();

        if (!section) {
            return;
        }

        if (section === "Eraser") {
            s.removeBlock(day, period);
            target.text("");
            target.attr("data-class", "");
            target.removeAttr("style");
            return;
        }

        s.setBlock(day, period, section);
        target.text(section);
        target.attr("data-class", section)
    },
    getNextClassRadioNumber: function() {
        var relevant = tabs.schedule.classList.find("*[type='radio']"),
            i, gather = [], temp, biggest = 0, least;

        // TODO: Optimize; this isnt very efficient but its also not critical

        // gather the used ids
        for (i=0; i < relevant.length; i+=1) {
            temp = relevant[i].id.split('-');
            temp = parseInt(temp[temp.length - 1], 10);
            gather.push(temp);
            biggest = Math.max(biggest, temp);
        }

        // find the smallest open id
        for (i=0; i < biggest; i += 1) {
            if (!~gather.indexOf(i)) {
                return tabs.schedule.radioName + "-" + i;
            }
        }

        return tabs.schedule.radioName + "-" + (biggest + 1);
    },
    loadEvents: function(tableGrid, s) {
        // attach handlers for switching edit action mode
        $("input[type='radio'][name='" + this.actionModeName + "']")
            .off("change").change( function(e) {
                if (!e.target.checked) {
                    return;
                }

                if (e.target.id === tabs.schedule.actionModeName + "-classes") {
                    tabs.schedule.styler.slideUp();
                    tabs.schedule.listContainer.css("opacity", 1);
                    tabs.schedule.listContainer.css("cursor", "auto");
                } else if (e.target.id === tabs.schedule.actionModeName + "-styler") {
                    tabs.schedule.styler.slideDown();
                    // we want it to take up space still, so set opacity
                    tabs.schedule.listContainer.css("opacity", 0);
                    tabs.schedule.listContainer.css("cursor", "default");
                }
            }
        );

        // attach editing handlers
        // for period
        tableGrid.getBody().on("dblclick", ".schedule-period", tabs.editHandler(
                         {"class": "schedule-table-input"}, this.periodEditor));
        // for day
        tableGrid.getHead().on("dblclick", ".schedule-day", tabs.editHandler(
                            {"class": "schedule-table-input"}, this.dayEditor));

        // event handler for each cell in the table (excluding period headers)
        tableGrid.getBody().on("click", "td:not(:first-child)", function(e) {
            var target = $(e.currentTarget),
                day = target.attr("data-day"),
                period = target.attr("data-period"),
                mode = $("input[name='" + tabs.schedule.actionModeName +
                         "']:checked");

            if (mode[0].id === tabs.schedule.actionModeName + "-styler") {
                tabs.schedule.setCellStyle(s, target, day, period);
            } else {
                // assume classes if (in any event) no radio is selected
                tabs.schedule.setCellClass(s, target, day, period);
            }
        });

        // prevent multiple calls to loadEvents from adding duplicate handlers
        this.classList.off("dblclick");
        // event handler for renaming and deleting classes
        this.classList.on("dblclick", "label", tabs.editHandler(
                          {"class": "schedule-class-input"}, this.classEditor));

        // class list add event
        // (any unused classes will disappear on reload, see this.load)
        this.addButton.click( function() {
            var radio = $("<input>"), label = $("<label>");
            // set the Id before adding radio to classList!
            radio.attr("id", tabs.schedule.getNextClassRadioNumber);
            label.attr("for", tabs.schedule.getNextClassRadioNumber);
            radio.attr("type", "radio");
            radio.attr("name", tabs.schedule.radioName);
            radio.appendTo(tabs.schedule.classList);
            label.appendTo(tabs.schedule.classList);
            // invoke the section editor
            label.trigger("dblclick");
        });

        // add period/day buttons
        tableGrid.getHeadCell(0, 0).on("click", this.scheduleEditor);
    },
    getSelectedClass: function() {
        return $("#schedule input[name=schedule-class]:checked").attr("data-class");
    },
    getSelectedStyle: function() {
        var s = $("#schedule input[name=" + this.quickstyleName + "]:checked")
        return {name: s[0].id, style: JSON.parse(s.attr("data-style"))};
    }
};

tabs.planner = {
    div: null,
    dayName: null,
    days: [],
    disabled: [],
    generateDay: function(element, date, c, s, p, dayIterator) {
        var block = dayIterator.getDate(date),
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

            if (day[i] && this.disabled.indexOf(day[i].name) === -1 ) {
                item.append( $("<span>").text(day[i].name) );
                if (day[i].meta.style) {
                    item.css(day[i].meta.style);
                }
            }
        }
    },
    generateMonth: function(div, date, omitWeekends, c, s, p, cycle) {
        var table, weeks, head, dow, oneClass = false;

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
        // add the day of the week to the number of days in the month
        // to compensate for months not starting on sunday
        weeks += date.getDay();
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

        if (tabs.planner.days.length > 0) {
            oneClass = true;
        }

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

            if (!oneClass) {
                tabs.planner.generateDay(cell, d, c, s, p, cycle);
            } else if (tabs.planner.days.indexOf(cycle.getDate(d)) === -1){
                // if oneClass and planner.days does not contain the cycle day
                cell.addClass("placeholder");
            } else {
                // if oneClass and planner.days.contains( cycle day )
                cell.addClass("one-class");
                cell.append($("<h1>").text(d.getDate() + " " + cycle.getDate(d)));
            }

        });
    },
    load: function(c, s, p) {
        // TODO: Add support for different planners
        // (lesson plans, yearly, weekly, per class)
        var date = new Date(c.start),
            div, i, dayDiv, toId,
            cycle = new DayIterator(c, s);

        this.div.empty();
        // add the day selector and event handler
        dayDiv = $("<div>").addClass("cp-radio-container").appendTo(this.div);
        dayDiv.attr("id", "planner-blanks");
        $("<button>").attr("data-clear", "clear")
                    .appendTo(dayDiv)
                    .text("Clear")
                    .click( function(i) {
            // prop method is different from the attr: it's actually a field
            $("input[name=" + tabs.planner.dayName + "]")
                .prop("checked", false);
            tabs.planner.days = [];
            tabs.switchTo("planner");
        });

        for (i=0; i < s.days.length; i+=1) {
            $("<input>").attr("data-day", s.days[i])
                        .attr("type", "checkbox")
                        .attr("name", tabs.planner.dayName)
                        .prop("id", tabs.planner.dayName + s.days[i])
                        .prop("checked",
                            tabs.planner.days.indexOf(s.days[i]) !== -1)
                        .appendTo(dayDiv);
            $("<label>").text(s.days[i])
                        .attr("for", tabs.planner.dayName + s.days[i])
                        .appendTo(dayDiv);
        }

        dayDiv.on("change", "input[type=checkbox]", function(e) {
            var i = tabs.planner.days.indexOf(
                                           $(e.currentTarget).attr("data-day"));
            if (e.currentTarget.checked) {
                // if this is checked and this day isnt added yet
                if (i === -1) {
                    tabs.planner.days.push($(e.currentTarget).attr("data-day"));
                }
            } else if (i !== -1) {
                // if this is not checked and day is in the list, remove it
                tabs.planner.days.splice(i, 1);
            }

            if (toId) {
                clearTimeout(toId);
            }
            toId = setTimeout(function(){tabs.switchTo("planner");}, 500);
        });

        while (dayLTE(date, c.end)) {
            div = $("<div>").addClass("planner-month").appendTo(this.div);
            this.generateMonth(div, date, true, c, s, p, cycle);
            date.setMonth(date.getMonth() + 1);
        }
    }
};

tabs.settings = {
    init: function(c, s, p) {
        var txt, booleanSetting;

        booleanSetting = function(elementId, objectRef, propName) {
            $("#" + elementId).prop("checked", objectRef[propName]);
            $("#" + elementId).change( function(e) {
                objectRef[propName] = e.target.checked;
            })
        };

        booleanSetting("s-planner-keepEmpty", p.planner, "keepEmpty");
        booleanSetting("s-planner-showPeriod", p.planner, "showPeriod");

        $("#s-save-button").click( function() {
            var o = "# lines starting with hash symbols are comments,\n" +
                    "# colons mark fields\n";
            o += s.toDataText();
            o += c.toDataText();
            $("#s-save-text").val(o);
            $("#s-save-text")[0].select();
        });

        booleanSetting("s-saving", p, "saving");

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
            m, year, table, header, div, dow, weeks, block, oldBlock,
            dayIterator = new DayIterator(c, s);

        $("#calendar-start-date").val(c.formatDate(c.start));
        $("#calendar-end-date").val(c.formatDate(c.end));

        this.div.empty();
        this.div.off("click");
        this.div.on("click", ".calendar-day", {calendar: c}, this.eventHandler);

        this.dayTypeSelector.off("change");
        this.dayTypeSelector.on("change", "input", this.cpTooltipEvent);

        $("#" + tabs.calendar.toolTipFormat + "-" + this.getDayType()).show();

        dow = $("<tr><td>M</td><td>T</td><td>W</td><td>H</td><td>F</td></tr>");
        while (dayLTE(current, c.end)) {
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

                block = dayIterator.getDate(d);
                // OPTIMIZATION: Cache day type
                if (!block) {
                    // block will be null if out of school year or NO_SCHOOL
                    cell.addClass("no-school");
                } else if (c.isDay(c.SET_DAY, d)) {
                    cell.addClass("set-day");
                    cell.text(block);
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
