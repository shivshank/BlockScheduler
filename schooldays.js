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
Calendar.prototype.toJSON = function() {
    var p, i, c = {},
        convert = function(i) {return {date: formatDate(i),
                                       block: i.block,
                                       classes: i.classes,
                                       tags: i.tags};};
    
    p = [this.SET_DAY, this.HALF_DAY, this.NO_CLASS, this.NO_SCHOOL];
    
    c.start = convert(this.start);
    c.end = convert(this.end);
    
    for (i=0; i < p.length; i+=1) {
        c[p[i]].forEach( function(j) {
            c[p[i]] = convert(c[p[i]]);
        });
    }
    
    return c;
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
    return d.getTime() >= this.start.getTime()
        && d.getTime() <= this.end.getTime()
        && d.getDay() !== 0 && d.getDay() !== 6
        && !this.isDay(this.NO_SCHOOL, d);
};

var Schedule = function(days, periods) {
    this.days = days.slice(), periods.slice();
    this.periods = periods;
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
Schedule.prototype.toJSON = function(spaces) {
    var s = {};
    
    s.days = this.days;
    s.periods = this.periods;
    s.array = this.array;
    
    return JSON.stringify(s, null, spaces || 0);
};
Schedule.prototype.fromJSON = function(j) {
    this.days = j.days;
    this.periods = j.periods;
    this.array = j.array;
};
Schedule.prototype.fromDataText = function(txt) {
    var o = parseDataText(txt);
    this.days = o.DAYS;
    this.periods = o.PERIODS;
    this.array = [];
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
    var i = this.periods.indexOf(period)
    return this.days.indexOf(day) * i + i;
};
Schedule.prototype.fromBlockId = function(i) {
    var b = Math.floor(i / this.periods);
    b = this.days[b];
    return {period: this.periods[i % this.periods.length], block: b};
};
Schedule.prototype.getBlock = function(day, period) {
    return this.array[this.blockId(day, period)];
};
Schedule.prototype.setBlock = function(day, period, section) {
    var i = this.blockId(day, period),
        oldSection = this.array[i];
    
    // decrement the occurrences of section
    this.preps[oldSection] -= 1;
    if (this.preps[oldSection] === 0) {
        this.fire("removePrep", [day, period, oldSection]);
        delete this.preps[oldSection];
    }
    
    // increment the occurrences of new section
    if (this.preps[section] === undefined || this.preps[section] === null) {
        // fire add prep handler
        this.fire("addPrep", [day, period, section]);
        this.preps[section] = 1;
    } else {
        this.preps[section] += 1;
    }
    
    this.fire("setSection", [day, period, section]);
    this.array[i] = section;
};
Schedule.prototype.getBlocks = function(section) {
    var r = [], i, b;
    
    for (i=0; i < this.array.length; i+=1) {
        if (this.array[i] === section) {
            b = this.fromBlockId(i);
            b.section = section;
            r.push(b);
        }
    }
    
    return b;
};
Schedule.prototype.getDay = function(d) {
    var r = [];
    
    var p = 0;
    for (p=0; p < this.periods.length; p+=1) {
        r.push( this.array[this.blockId(d, this.periods[p])] );
    }
    
    return r;
};
Schedule.prototype.getPeriod = function(p) {
    var r = [];
    
    var d = 0;
    for (d=0; d < this.days.length; d+=1) {
        r.push( this.array[this.blockId(d, p)] );
    }
    
    return r;
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
    return a.getTime() === b.getTime();
};

function forEachSchoolDay(cal, sched, func, start, end, start_block) {
    var i = new Date(start? start : cal.start),
        block = dayEquals(i, cal.start)? sched.days[0] 
                                       : sched.days.indexOf(start_block),
        daysOff = 0,
        result;
        
    if (block === null || block === undefined) {
        // Is there a better way to throw exceptions, or are they this broken?
        throw "Cannot select a start block";
    }
    
    end = end? end : cal.end;
    for (; i.getTime() < end.getTime() + 1; i.setDate(i.getDate() + 1)) {
        
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

function getBlockDay(calendar, schedule, d, previous) {
    // returns null if day is not in the school year (ie, holiday and summer)
    // previous should be the block of the last school day
    var r = null, func;
    
    func = function(i, block) {
        if (dayEquals(i,d)) {
            r = block;
            return false;
        }
    };
    
    // TODO: Add optimization here to speed up this function
    if (previous) {
        // use the previous day - it won't matter if its not a school day
        console.log("WANRING: Using untested code path!");
        forEachSchoolDay(calendar, schedule, func,
          new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1), null, previous);
    } else {
        forEachSchoolDay(calendar, schedule, func);
    }
    
    return r;
};

/*
var log = "";

console.log = function() {
    var args = Array.prototype.slice.call(arguments, 0);
   log = log + "\n" + args.join(" ");
};
*/