var percentile = function(l, p) {
    l = l.slice(0);
    l.sort(function(a, b){return a - b});
    return l[Math.floor(l.length * p / 100)];
};

var min = function(l) {
    return Math.min.apply(Math, l);
};

var max = function(l) {
    return Math.max.apply(Math, l);
};

var median = function(l) {
    var mid = Math.floor(l.length / 2);
    l = l.slice(0);
    l.sort(function(a, b) {return a - b;});
    return l.length % 2 === 0? (l[mid] + l[mid-1])/2 : l[mid];
};

var average = function(l) {
    var sum = l.reduce( function(a, b) { return a + b });
    return sum / l.length;
};


// ANALYSIS

var analyzer = {};

analyzer.dayCounter = function() {
    results.totalDays = 0;
    results.daysInMonth = [0];

    var month = params.start.getMonth();
    var d = 0;

    return function(i, block) {
        if (i.getMonth() !== month) {
            month = i.getMonth();
            results.daysInMonth.push(0);
            d = 0;
        }
        d += 1;
        results.totalDays += 1;
        results.daysInMonth[results.daysInMonth.length - 1] = d;
    };
};

analyzer.blockCounter = function() {
    results.blockDays = {A:0, B:0, C:0, D:0, E:0, F:0};
    return function(i, block) {
        results.blockDays[translator[block]] += 1;
    };
};

analyzer.sessionCounter = function(onBlocks) {
    onBlocks = onBlocks.map( function(j) {
        return reverser[j];
    });

    var on = onBlocks.indexOf(0) !== -1? true : false;

    results.stretches = on? [] : [0];
    var stretches = results.stretches;

    return function(i, block, daysOff) {
        if (!on && onBlocks.indexOf(block) !== -1) {
            // landed on an on day
            stretches[stretches.length - 1] += daysOff;
            on = true;
        } else if (!on) {
            // in an off stretch
            stretches[stretches.length - 1] += daysOff;
            stretches[stretches.length - 1] += 1;
        } else if (on && onBlocks.indexOf(block) === -1) {
            // landed on an off day
            stretches.push(1 + daysOff);
            on = false;
        } else if (on && daysOff !== 0) {
            // on day with a break inbetween
            stretches.push(daysOff);
        } else if (on) {
            // on day, no stretch
        } else {
            // this should never trigger; safeguard that we caught all combos
            console.log("ERROR!");
        }
    };
};

/* Check this object to see the result of running each function */
var results = {
};

/*
    Run all the tests:
        - Count the number of times each day meets
        - Count the number of days in each month
        - Calculate the lengths of stretches between continuous sessions
        - Return the class time a class running onDays receives
*/
var mainloop = function(onDays) {
    var dc = analyzer.dayCounter();
    var bc = analyzer.blockCounter();
    var sc = analyzer.sessionCounter(onDays);
    results.days = [];

    forEachSchoolDay(params.start, params.end,
        function(i, block, daysOff) {
            dc(i, block);
            bc(i, block);
            sc(i, block, daysOff);
            //daysOff !== 0? console.log(i.toDateString(), daysOff) : null;
            results.days.push( day(i, block) );
        }
    );

    // return the amount of class time onDays received in minutes
    return params.period_length * onDays.map( function(d) {
        return results.blockDays[d];
    }).reduce( function(a, b) {
        return a + b;
    });
};

var classResult = function(onDays) {
    return {
        class_days: onDays,
        class_time: mainloop(onDays),
        stretches: results.stretches,
    };
};

var evaluateBlockScheduling = function() {
    log = "";
    var tests = [
        "ABDE",
        "AD",
        "BCEF",
        "BE",
        "ACDF",
        "CF"
    ];
    Array.prototype.push.apply(tests, "ABCDEF".split(""));
    tests = tests.map( function(i) {return i.split("");} );

    var output = [];

    tests.forEach( function(i) {
        output.push(classResult(i));
    });

    console.log("Days In Months:", results.daysInMonth);
    console.log("Total school days:", results.totalDays);

    var stringify = function() {
        var t = this;
        return "{ " + Object.keys(this).map( function(i) {
            return i + ": " + t[i];
        }).join(", ") + " }";
    };
    console.log("Number of Sessions:", results.blockDays);

    results.blockScheduling = output;
};

var evaluateOldScheduling = function() {
    var rig = params.rigdays;
    params.max_block = 1;
    params.rigdays = [
        day("November 24 2014", 1),
        day("January 30 2015", 1)
    ];
    params.period_length = 40;

    var tests = [
        "AB",
        "A",
        "B"
    ];
    tests = tests.map( function(i) {return i.split("");} );

    var output = [];

    tests.forEach( function(i) {
        output.push(classResult(i));
    });

    results.oldScheduling = output;

    params.rigdays = rig;
};
