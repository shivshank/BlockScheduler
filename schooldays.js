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

/*
var log = "";

console.log = function() {
    var args = Array.prototype.slice.call(arguments, 0);
   log = log + "\n" + args.join(" ");
};
*/