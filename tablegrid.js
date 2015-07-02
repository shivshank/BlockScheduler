var tableGrid = {
	create: function(rowWidth1, rowWidth2, rowWidthN) {
		var args = Array.prototype.slice.call(arguments),
            i, j, t;
		
        t = Object.create(tableGrid);
        t.table = $("<table>");
        t.head = $('<thead>');
        t.table.append(t.head);
        t.body = $("<tbody>");
        t.body.appendTo(t.table);
        t.foot = $('<tfoot>');
        t.table.append(t.foot);
        
        for (i=0; i < args.length; i+=1) {
            row = $("<tr>");
            t.body.append( row );
            for (j=0; j < args[i]; j+=1) { 
                row.append( $("<td>") );
            }
        }
        return t;
	},
    /** Use the first row (via cloning) for each row  */
    makeUniform: function(height) {
        var i, base;
        base = this.body.children().eq(0).detach();
        this.body.empty();
        for (i=0; i < height; i+=1) {
            this.body.append( base.clone() );
        }
    },
    getTable: function() {
        return this.table;
    },
    getHead: function() {
        return this.head;
    },
    getFoot: function() {
        return this.foot;
    },
    getBody: function() {
        return this.body;
    },
    setClasses: function(tableRows, tableDatas) {
        this.table.children().addClass(tableRows).forEach( function(i, v) {
            // for each table row
            $(v).children().addClass(tableDatas);
        });
    },
    // call callback on [start, end) bounds with ($(cell), $(row), x, y)
    forEachCell: function(callback, startX, startY, endX, endY) {
        var x, y,
            startX = startX || 0, startY = startY || 0,
            endX = endX || 0, endY = endY || 0;
        
        // OPTOMIZE: Stop iterating over cells out of bounds
        
        if (endY === 0) {
            endY = this.body.children().length;
        }
            
        y = 0;
        this.body.children().each( function(i, v) {
            if (endX === 0) {
                endX = $(v).children().length;
            }
            // for each table row
            x = 0;
            $(v).children().each( function(index, value) {
                // for each td in bounds
                if (x >= startX && x < endX && y >= startY && y < endY) {
                    callback($(value), $(v), x, y);
                }
                x += 1;
            });
            y += 1;
        });
    }
};