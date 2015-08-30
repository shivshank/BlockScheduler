var parseDataText = function(txt) {
    // Use this function to read the data files created by Calendar and Schedule
    var lines = txt.replace("\r\n", "\n").split("\n");
    var field = "", out = {};

    lines.forEach( function(i) {
        if (i[0] !== "#" && i[0] !== ":" && i.trim() != "" && field) {
            out[field].push(i.trim());
        } else if (i[0] === ":") {
            field = i.slice(1).trim();
            out[field] = [];
        }
    });

    return out;
};
var toDataText = function(txt) {
    txt = [].concat(txt);
    return txt.join("\n") + "\n";
};

var Calendar = function(start, end) {
    this.start = start;
    this.end = end;
    this.SCHOOL_DAY = "school_day";
    this.SET_DAY = "set_day";
    this.HALF_DAY = "half_day";
    this.NO_CLASS = "no_session";
    this.NO_SCHOOL = "no_school";
    this._data = {};
    this._data[this.SET_DAY] = [];
    this._data[this.HALF_DAY] = [];
    this._data[this.NO_CLASS] = [];
    this._data[this.NO_SCHOOL] = [];
    this.callbacks = {
        setDay: []
    };
};
Calendar.prototype.on = function(event, func) {
    this.callbacks[event].push(func);
};
Calendar.prototype.fire = function(event, args) {
    var i;
    for (i=0; i < this.callbacks[event].length; i+=1) {
        this.callbacks[event][i].apply(event, args);
    }
};
Calendar.prototype.eraseDay = function(day) {
    // removes all information related to day
    var types = Object.keys(this._data), i, j, v, search;

    for (i=0; i < types.length; i+=1) {
        // for each type of day in the calendar
        for (j=0; j < this._data[types[i]].length; j+=1) {
            // for each day v in that array
            v = this._data[types[i]][j];
            if (dayEquals(day, v)) {
                // if day is in this array, then splice it out
                this._data[types[i]].splice(j, 1);
                j-=1;
            }
        }
    }
};
Calendar.prototype.setDay = function(property, day) {
    this.eraseDay(day);
    this._data[property].push(day);
    this.fire("setDay", [property, day]);
};
Calendar.prototype.formatDate = function(d) {
    return day.formatDate(d);
};
Calendar.prototype.toJSON = function(spaces) {
    var p, i, j, c = {},
        convert = function(i) {return {date: day.formatDate(i),
                                       block: i.block,
                                       periods: i.periods,
                                       tags: i.tags};};

    p = [this.SET_DAY, this.HALF_DAY, this.NO_CLASS, this.NO_SCHOOL];

    c.start = convert(this.start);
    c.end = convert(this.end);

    for (i=0; i < p.length; i+=1) {
        c[p[i]] = [];
        for (j=0; j < this._data[p[i]].length; j+=1) {
            c[p[i]].push( convert(this._data[p[i]][j]) );
        }
    }

    return JSON.stringify(c, null, spaces || 0);
};
Calendar.prototype.fromJSON = function(j) {
    var t = JSON.parse(j),
        convert = function(i) {return day(i.date, i);};

    this._data[this.NO_SCHOOL] = t[this.NO_SCHOOL].map(convert);
    this._data[this.NO_CLASS] = t[this.NO_CLASS].map(convert);
    this._data[this.SET_DAY] = t[this.SET_DAY].map(convert);
    this._data[this.HALF_DAY] = t[this.HALF_DAY].map(convert);

    this.start = convert(t.start);
    this.end = convert(t.end);
};
Calendar.prototype.fromDataText = function(txt) {
    var o = parseDataText(txt);
    window.demo = o;
    this.start = day(o.START[0]);
    this.end = day(o.END[0]);

    var mapper = function(i) {
        return day(i.trim());
    };

    this._data[this.NO_SCHOOL] = o["NO SCHOOL"].map(mapper);
    this._data[this.NO_CLASS] = o["NO CLASS"].map(mapper);

    this._data[this.SET_DAY] = o["SET DAY"].map(function(i) {
        var d = i.trim().split("|");
        return day(d[0].trim(), {block: d[1].trim()});
    });
    this._data[this.HALF_DAY] = o["HALF DAY"].map(function(i) {
        var d = i.trim().split("|");
        return day(d[0].trim(), {periods: d[1].trim().split(" ")});
    });
};
Calendar.prototype.toDataText = function() {
    var o = "", add = toDataText;

    o += add(":START");
    o += add(this.formatDate(this.start));
    o += add(":END");
    o += add(this.formatDate(this.end));
    o += add(":NO SCHOOL");
    o += add(this._data[this.NO_SCHOOL].map(this.formatDate));
    o += add(":NO CLASS");
    o += add(this._data[this.NO_CLASS].map(this.formatDate));
    o += add(":SET DAY");
    o += add(this._data[this.SET_DAY].map(function(d) {
        return day.formatDate(d) + " | " + d.block;
    }));
    o += add(":HALF DAY");
    o += add(this._data[this.HALF_DAY].map(function(d) {
        return Calendar.prototype.formatDate.call(null, d) +
               " | " + d.periods.join(" ");
    }));

    return o;
};
Calendar.prototype.isDay = function(day_type, day) {
    var i;

    for (i=0; i < this._data[day_type].length; i+=1) {
        if (dayEquals(this._data[day_type][i], day)) {
            return this._data[day_type][i];
        }
    }

    return null;
};
Calendar.prototype.getDayType = function(day) {
    if (this.isDay(this.NO_SCHOOL, day)) {
        return this.NO_SCHOOL;
    } else if (this.isDay(this.NO_CLASS, day)) {
        return this.NO_CLASS;
    } else if (this.isDay(this.SET_DAY, day)) {
        return this.SET_DAY;
    } else if (this.isDay(this.HALF_DAY, day)) {
        return this.HALF_DAY;
    } else {
        return this.SCHOOL_DAY;
    }
};
Calendar.prototype.isSchoolDay = function(d) {
    // DO NOT CHECK OFF DAYS - School is in session, but no classes are
    return dayGTE(d, this.start)
        && dayLTE(d, this.end)
        && d.getDay() !== 0 && d.getDay() !== 6
        && !this.isDay(this.NO_SCHOOL, d);
};

var Schedule = function(days, periods) {
    this.days = days.map( function(i) {return i.toString();} );
    this.periods = periods.map( function(i) {return i.toString()} );
    this.array = [];
    // the set of all sections in the array (key) and its occurrences (value)
    this.preps = {};
    this.callbacks = {
        // f(day, period, section)
        addPrep: [],
        // f(day, period, section)
        removePrep: [],
        // f(day, period, section)
        setSection: []
    };
};
Schedule.prototype.addPeriod = function(p) {
    var i;
    this.periods.push(p.toString());

    // adjust all the indices of other classes (in reverse order)
    for (i = (this.periods.length - 1) * (this.days.length - 1);
         i >= this.periods.length - 1; i -= this.periods.length - 1) {
        this.array.splice(i, 0, null);
    }
};
Schedule.prototype.addDay = function(d) {
    this.days.push(d.toString());
};
Schedule.prototype.renamePeriod = function(period, newName) {
    this.periods[this.periods.indexOf(period)] = newName.toString();
};
Schedule.prototype.renameDay = function(day, newName) {
    this.days[this.days.indexOf(day)] = newName.toString();
};
Schedule.prototype.removePeriod = function(p) {
    var i, day, indices = [];
    for (i=0; i < this.days.length; i+=1) {
        day = this.days[i];
        indices.push(this.blockId(day, p));
        // make sure preps are adjusted
        this.removeBlock(day, p);
    }
    // splice in reverse so that the next index doesn't shift
    for (i=indices.length-1; i >= 0; i-=1) {
        this.array.splice(indices[i], 1);
    }

    this.periods.splice(this.periods.indexOf(p), 1);
};
Schedule.prototype.removeDay = function(d) {
    var i, period;
    for (i=0; i < this.periods.length; i+=1) {
        period = this.periods[i];
        // make sure preps are adjusted
        this.removeBlock(d, period);
    }
    this.array.splice(this.blockId(d, this.periods[0]), this.periods.length);
    this.days.splice(this.days.indexOf(d), 1);
};
Schedule.prototype.toJSON = function(spaces) {
    var s = {};

    s.days = this.days;
    s.periods = this.periods;
    s.array = this.array;

    return JSON.stringify(s, null, spaces || 0);
};
Schedule.prototype._prepsField = function() {
    var i, v;
    this.preps = {};
    for (i=0 ; i < this.array.length; i+=1) {
        v = this.array[i];
        if (v === undefined || v === null) {
            continue;
        }

        if (this.preps[v.name] === undefined || this.preps[v.name] === null) {
            this.preps[v.name] = 1;
        } else {
            this.preps[v.name] += 1;
        }
    }
};
Schedule.prototype.fromJSON = function(j) {
    j = JSON.parse(j);
    this.days = j.days.map( function(i) {return i.toString();} );
    this.periods = j.periods.map( function(i) {return i.toString();} );
    this.array = j.array;
    // must load preps so that they are not out of sync with array
    this._prepsField();
};
Schedule.prototype.fromDataText = function(txt) {
    var o = parseDataText(txt);
    // everything from data text should be a string
    this.days = o.DAYS;
    this.periods = o.PERIODS;
    this.array = [];
    // no preps to load
};
Schedule.prototype.toDataText = function() {
    var o = "", add = toDataText;

    o += add(":DAYS");
    o += add(this.days);
    o += add(":PERIODS");
    o += add(this.periods);
    return o;
};
Schedule.prototype.on = function(event, func) {
    this.callbacks[event].push(func);
};
Schedule.prototype.fire = function(event, args) {
    this.callbacks[event].forEach( function(i) {
        i.apply(null, args);
    });
};
Schedule.prototype.getPreps = function() {
    return Object.keys(this.preps);
};
Schedule.prototype.blockId = function(day, period) {
    var i = this.periods.indexOf(period.toString());
    return this.days.indexOf(day.toString()) * this.periods.length + i;
};
Schedule.prototype.fromBlockId = function(i) {
    var b = Math.floor(i / this.periods.length);
    b = this.days[b];
    return {period: this.periods[i % this.periods.length], day: b};
};
Schedule.prototype.getBlock = function(day, period) {
    return this.array[this.blockId(day.toString(), period.toString())];
};
Schedule.prototype.removeBlock = function(day, period) {
    var i = this.blockId(day, period),
        section = this.getBlock(day, period);

    // decrement occurrences
    if (section) {
        this.preps[section.name] -= 1;
        if (this.preps[section.name] === 0) {
            this.fire("removePrep", [day, period, section]);
            delete this.preps[section.name];
        }
    }

    this.array[i] = null;
};
Schedule.prototype.setBlock = function(day, period, section, meta) {
    var i = this.blockId(day, period),
        name = section.toString();

    section = {
        name: name,
        meta: meta || {}
    };

    this.removeBlock(day, period);
    // increment the occurrences of new section
    if (!this.preps.hasOwnProperty(name)) {
        // fire add prep handler
        this.fire("addPrep", [day, period, section]);
        this.preps[name] = 1;
    } else {
        this.preps[name] += 1;
    }

    this.fire("setSection", [day, period, section]);
    this.array[i] = section;
};
Schedule.prototype.getBlocks = function(sectionName) {
    // returns an array of {day, period, section: {name, meta}} objects
    var r = [], i, b;

    for (i=0; i < this.array.length; i+=1) {
        if (this.array[i] && this.array[i].name === sectionName) {
            b = this.fromBlockId(i);
            b.section = this.array[i];
            r.push(b);
        }
    }

    return r;
};
Schedule.prototype.removeSection = function(sectionName) {
    var blocks = this.getBlocks(sectionName),
        i;

    for (i=0; i < blocks.length; i+=1) {
        this.removeBlock(blocks[i].day, blocks[i].period);
    }
};
Schedule.prototype.renameSection = function(sectionName, newName) {
    var blocks = this.getBlocks(sectionName),
        i;

    for (i=0; i < blocks.length; i+=1) {
        this.setBlock(blocks[i].day, blocks[i].period,
                      newName, blocks[i].section.meta);
    }
};
Schedule.prototype.getDay = function(d) {
    var i;
    i = this.blockId(d, this.periods[0]);
    return this.array.slice(i, i + this.periods.length);
};
Schedule.prototype.getPeriod = function(p) {
    var r = [];

    var d = 0;
    for (d=0; d < this.days.length; d+=1) {
        r.push( this.array[this.blockId(this.days[d], p)] );
    }

    return r;
};
Schedule.prototype.isEmptyPeriod = function(p) {
    var d;

    for (d=0; d < this.days.length; d+=1) {
        if (this.getBlock(this.days[d], p.toString())) {
            return false;
        }
    }

    return true;
};

var Section = function(name, period, on_days, css) {
    this.name = name;
    this.period = period;
    this.on_days = on_days;
    this.css = css;
};
Section.prototype.removeBlock = function(b) {
    var i = this.on_days.indexOf(b);
    if (i !== -1) {
        this.on_days.splice(i, 1);
    }
};

/* Wrap date object with school day information */
var day = function(dateStr, data) {
    var d;

    d = new Date(dateStr);

    if (data) {
        d.block = data.block;
        // the periods associated with this day
        d.periods = data.periods;
        d.tags = data.tags;
    }

    return d;
};

/**
 * @param includeWeekends true if x == 0 means Sunday
 */
day.fromGrid = function(year, month, x, y, excludeWeekends) {
    // month, x, and y are zero based
    var i, date = new Date(year, month, 1);

    i = x + y * 7;

    if (excludeWeekends) {
        // move x ahead to include sunday
        // (end of week is irrelevant because x should never be 6 on this grid)
        i += 1;
    }

    // what day is the first of the month?
    // remove that from i
    // (because Sunday is zero, we don't need extra offset)
    i -= date.getDay();
    // add one since setDate is one based
    date.setDate(1 + i);
    return date;
};

day.months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November",
              "December"];

day.formatDate = function(d) {
    return day.months[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();
};

var dayEquals = function(a, b) {
    a = new Date(a);
    b = new Date(b);
    a.setHours(0, 0, 0);
    b.setHours(0, 0, 0);
    // the date object DOES NOT override === or == operators, must use getTime
    return a.getTime() === b.getTime();
};

var dayLT = function(a, b) {
    a = new Date(a);
    b = new Date(b);
    a.setHours(0, 0, 0);
    b.setHours(0, 0, 0);
    // the date object overrides < and > operators
    return a < b;
};

var dayLTE = function(a, b) {
    a = new Date(a);
    b = new Date(b);
    a.setHours(0, 0, 0);
    b.setHours(0, 0, 0);
    // the date object overrides < and > operators
    return a <= b;
};

var dayGT = function(a, b) {
    a = new Date(a);
    b = new Date(b);
    a.setHours(0, 0, 0);
    b.setHours(0, 0, 0);
    return a > b;
}

var dayGTE = function(a, b) {
    a = new Date(a);
    b = new Date(b);
    a.setHours(0, 0, 0);
    b.setHours(0, 0, 0);
    // the date object overrides < and > operators
    return a >= b;
}

function forEachSchoolDay(cal, sched, func) {
    var i = new Date(cal.start),
        block = sched.days[0],
        end = cal.end,
        daysOff = 0,
        result;

    if (block === null || block === undefined) {
        // Is there a better way to throw exceptions, or are they this broken?
        throw "Cannot select a start block";
    }

    for (; dayLTE(i, end); i.setDate(i.getDate() + 1)) {

        if (!cal.isSchoolDay(i)) {
            daysOff += 1;
            continue;
        } else if (cal.isDay(cal.NO_CLASS, i)) {
            daysOff += 1;
        }

        if (cal.isDay(cal.SET_DAY, i)) {
            block = cal.isDay(cal.SET_DAY, i).block;
        }

        result = func(i, block, daysOff);

        // exit if func is false
        if (result === false) {
            break;
        }

        daysOff = 0;
        var orig = block;
        block = (sched.days.indexOf(block) + 1) % (sched.days.length);

        block = sched.days[ block ];
    }
};

function getBlockDay(calendar, schedule, d) {
    // returns null if day is not in the school year (ie, holiday and summer)

    var r = null, func, previous;

    func = function(i, block) {
        if (dayEquals(i,d)) {
            r = block;
            return false;
        }
    };

    forEachSchoolDay(calendar, schedule, func);

    return r;
};

var DayIterator = function(calendar, schedule, start, start_block) {
    var days;
    this.calendar = calendar;
    this.schedule = schedule;
    this.date = new Date(start? start : calendar.start);
    this.previous = null;
    this.nextCycle = start_block? start_block : schedule.days[0];
    this.done = false;

    if (dayLT(this.date, calendar.start)) {
        this.date = new Date(calendar.start);
    } else if (dayGT(this.date, calendar.end)) {
        // return null since its a useless iterator...
        // though..., should we instead just clamp the date?
        return null;
    }


    this.cycle = calendar.isSchoolDay(this.date)? this.nextCycle : null;

    days = this.schedule.days;
    if (this.cycle !== null) {
        this.nextCycle = days[(days.indexOf(this.nextCycle) + 1)
                            % (days.length)];
    }
};

DayIterator.prototype.current = function() {
    return this.cycle;
}

DayIterator.prototype.getDate = function(date) {
    if (dayLT(date, this.calendar.start)) {
        return null;
    }

    if (dayLT(date, this.date)) {
        console.log(this.calendar.formatDate(date), this.calendar.formatDate(this.date));
        throw "Cannot go in reverse, cache the results of DayIterator.";
    }
    if (!this.hasNext()) {
        return null;
    }

    while (dayLT(this.date, date) && this.hasNext()) {
        this.next();
    }

    return this.current();
};

DayIterator.prototype.hasNext = function() {
    return !this.done;
}

DayIterator.prototype.next = function() {
    var setDay, days = this.schedule.days;

    this.date.setDate(this.date.getDate() + 1);
    if (dayGT(this.date, this.calendar.end)) {
        this.done = true;
        this.cycle = null;
        this.nextCycle = null;
        return null;
    }

    if (this.cycle) {
        this.previous = this.cycle;
    }

    setDay = this.calendar.isDay(this.calendar.SET_DAY, this.date);
    if (setDay) {
        this.cycle = setDay.block;
        this.nextCycle = setDay.block;
    } else if (this.calendar.isSchoolDay(this.date)) {
        this.cycle = this.nextCycle;
    } else {
        // don't advance the cycle if it's not a school day
        this.cycle = null;
        return null;
    }
    // advance the cycle (it can only be a SET_DAY or SCHOOL_DAY here)
    this.nextCycle = days[(days.indexOf(this.nextCycle) + 1) % (days.length)];

    return this.cycle;
};

/*
var log = "";

console.log = function() {
    var args = Array.prototype.slice.call(arguments, 0);
   log = log + "\n" + args.join(" ");
};
*/
