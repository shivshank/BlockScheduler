var Calendar = function(start, end) {
    this.start = start;
    this.end = end;
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
Calendar.prototype.setDay = function(property, day) {
    this._data[property].forEach( function(v, i) {
        if (dayEquals(i, day)) {
            this._data[property][i] = day;
        }
    });
};
Calendar.prototype.formatDate = function(d) {
    var months = ["January", "February", "March", "April", "May",
                  "June", "July", "August", "September", "October",
                  "November", "December"];
    return months[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();
};
Calendar.prototype.toJSON = function() {
    var p, i, c = {},
        convert = function(i) {return {date: formatDate(i),
                                       block: i.block,
                                       attendence: i.attendence,
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
Calendar.prototype.isDay = function(day_type, day) {
    var i;
    
    for (i=0; i < this._data[day_type].length; i+=1) {
        if (dayEquals(this._data[day_type][i], day)) {
            return this._data[day_type][i];
        }
    }
    
    return null;
};
Calendar.prototype.isSchoolDay = function(d) {
    // DO NOT CHECK OFF DAYS - School is in session, but no classes are
    return d.getTime() >= this.start.getTime()
        && d.getTime() <= this.end.getTime()
        && d.getDay() !== 0 && d.getDay() !== 6
        && !this.isDay(this.NO_SCHOOL, d);
};
Calendar.prototype.forEachSchoolDay = function(start, end, func, start_block) {
    var i = new Date(start),
        block = dayEquals(i, this.start)? 0 : this.blocks.indexOf(start_block),
        daysOff = 0,
        result;
        
    if (block === null || block === undefined) {
        // Is there a better way to throw exceptions, or are they this broken?
        throw "Cannot select a start block";
    }
    
    for (; i.getTime() < end.getTime() + 1; i.setDate(i.getDate() + 1)) {
        
        if (!this.isSchoolDay(i)) {
            daysOff += 1;
            continue;
        } else if (this.isDay(this.NO_CLASS, i)) {
            daysOff += 1;
        }
        
        if (this.isDay(this.SET_DAY, i)) {
            block = this.blocks.indexOf(isDay(this.SET_DAY, i).block);
        }
        
        result = func(i, block, daysOff);
        
        // exit if func is false
        if (result === false) {
            break;
        }
        
        daysOff = 0;
        block = (block + 1) % (this.blocks.length + 1);
    }
};

var Schedule = function(days, periods) {
    this.days = days;
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
Schedule.prototype.on = function(event, func) {
    this.callbacks[event].push(func);
};
Schedule.prototype.fire = function(event, args) {
    this.callbacks[event].forEach( function(i) {
        i.apply(null, args);
    });
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
        // "AM" if students attended in the morning else "PM"
        d.attendence = data.attendence;
        // "AM" if morning classes were taken, else "PM"
        d.classes = data.classes;
        d.tags = data.tags;
    }
    
    return d;
};

var dayEquals = function(a, b) {
    return a.getTime() === b.getTime();
};

// CONFIGURATION

var params = {
    period_length: 60,
    periods: 7,
    start: new Date("September 2 2014"),
    end: new Date("June 24 2015"),
    start_block: "A",
    max_block: "F",
    blocks: ["A", "B", "C", "D", "E", "F"],
    reverser: null,
    calendar: {
        no_school: null,
        no_session: null,
        set_day: null,
        half_day: null
    },
    // dictionary of actual school days
    days: null, 
    isDay: function(dayType, date) {
        var i;
        for(i=0; i < this.calendar[dayType].length; i+=1) {
            if (dayEquals(this.calendar[dayType][i], date)) {
                return this.calendar[dayType][i];
            }
        }
        return null;
    }
};

params.getReverser = function() {
    var r = {};
    params.blocks.forEach( function(v, i) {
        r[v] = i;
    });
    return params.reverser = r;
}
    
params.getReverser();

// HELPER FUNCTIONS

params.isSchoolDay = function(d) {
    // DO NOT CHECK OFF DAYS - School is in session, but no classes are
    return d.getTime() >= params.start.getTime()
        && d.getTime() <= params.end.getTime()
        && d.getDay() !== 0 && d.getDay() !== 6
        && !params.isDay("no_school", d);
};



/*
    calls func with (date, block) for each school day between start and end
        where block is the block number
    if func returns false, forEachSchoolDay will break
*/
params.forEachSchoolDay = function(start, end, func, start_block) {
    
    var i = new Date(start),
        block = dayEquals(start, params.start)?
                    params.reverser[params.start_block]
                    : params.reverser[start_block],
        daysOff = 0,
        result;
        
    if (block === null || block === undefined) {
        throw "Cannot select a start block";
    }
    
    for (; i.getTime() < end.getTime() + 1; i.setDate(i.getDate() + 1)) {
        
        if (!params.isSchoolDay(i)) {
            daysOff += 1;
            continue;
        } else if (params.isDay("no_session", i)) {
            daysOff += 1;
        }
        
        if (params.isDay("set_day", i)) {
            block = params.reverser[params.isDay("set_day", i).block];
        }
        
        result = func(i, block, daysOff);
        
        // exit if func is false
        if (result === false) {
            break;
        }
        
        daysOff = 0;
        block = (block + 1) % (params.reverser[params.max_block] + 1);
    }
};

params.getBlockDay = function(d) {
    // REFACTOR: use subtraction rather than iteration?
    var r = null;
    
    params.forEachSchoolDay(params.start, params.end,
        function(i, block) {
            if (dayEquals(i, d)) {
                r = block;
                return false;
            }
        }
    );
    
    return r;
};

var getBlockDay = function(calendar, schedule, d) {
    var r = null;

    calendar.forEachSchoolDay(calendar.start, calendar.end,
        function(i, block) {
            if (dayEquals(i,d)) {
                r = block;
                return false;
            }
        }
    );

    return r;
};

/*
var log = "";

console.log = function() {
    var args = Array.prototype.slice.call(arguments, 0);
   log = log + "\n" + args.join(" ");
};
*/