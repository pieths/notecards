/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */


function parsePointArgs(x, y)
{
    if ((typeof x == "number") &&
        (typeof y == "number"))
    {
        return {x: x, y: y};
    }
    else if (typeof x === "string")
    {
        let parts = x.trim().split(/\s*,?\s+/);
        if (parts.length >= 2)
        {
            let x = parseFloat(parts[0]);
            let y = parseFloat(parts[1]);

            if (!Number.isNaN(x) && !Number.isNaN(y))
            {
                return {x: x, y: y};
            }
        }
    }
    else if (x instanceof Point) return x;

    return {x: 1, y: 1};
}


function parseBoundsArgs(arg1, arg2, arg3, arg4)
{
    if ((typeof arg1 == "number") &&
        (typeof arg2 == "number") &&
        (typeof arg3 == "number") &&
        (typeof arg4 == "number"))
    {
        return {
            x: arg1,
            y: arg2,
            width: Math.max(arg3, 0),
            height: Math.max(arg4, 0)
        };
    }
    else if (typeof arg1 === "string")
    {
        let parts = arg1.trim().split(/\s*,?\s+/);
        if (parts.length >= 4)
        {
            let x = parseFloat(parts[0]);
            let y = parseFloat(parts[1]);
            let width = parseFloat(parts[2]);
            let height = parseFloat(parts[3]);

            if (!Number.isNaN(x) &&
                !Number.isNaN(y) &&
                !Number.isNaN(width) &&
                !Number.isNaN(height))
            {
                return {
                    x: x,
                    y: y,
                    width: Math.max(width, 0),
                    height: Math.max(height, 0)
                };
            }
        }
    }
    else if ((arg1 instanceof Point) &&
             (arg2 instanceof Point))
    {
        return {
            x: arg1.x,
            y: arg1.y,
            width: Math.max(arg2.x, 0),
            height: Math.max(arg2.y, 0)
        };
    }
    else if ((arg1 instanceof Point) &&
             (typeof arg2 == 'number') &&
             (typeof arg3 == 'number'))
    {
        return {
            x: arg1.x,
            y: arg1.y,
            width: Math.max(arg2, 0),
            height: Math.max(arg3, 0)
        };
    }
    else if (arg1 instanceof Bounds) return arg1;

    return {x: 0, y: 0, width: 1, height: 1};
}


/*
 * Point Class Object
 */

function Point(x, y)
{
    var args = parsePointArgs(x, y);

    this.x = args.x;
    this.y = args.y;
}

Point.prototype.toString = function()
{
    return `${this.x} ${this.y}`;
}

Point.prototype.copy = function()
{
    return new Point(this.x, this.y);
}

Point.prototype.add = function(x, y)
{
    let args = parsePointArgs(x, y);
    this.x += args.x;
    this.y += args.y;
    return this;
};

Point.prototype.addX = function(x)
{
    this.x += x;
    return this;
};

Point.prototype.addY = function(y)
{
    this.y += y;
    return this;
};

Point.prototype.offset = function(x, y)
{
    let args = parsePointArgs(x, y);
    return new Point(this.x + args.x, this.y + args.y);
};

Point.prototype.offsetX = function(x)
{
    return new Point(this.x + x, this.y);
};

Point.prototype.offsetY = function(y)
{
    return new Point(this.x, this.y + y);
};


/*
 * Bounds Class Object
 */

function Bounds(x, y, width, height)
{
    var args = parseBoundsArgs(x, y, width, height);

    this.x = args.x;
    this.y = args.y;

    /*
     * Force the assignment of the width and
     * height to be a value which is >= 0.
     */
    var width = args.width;
    var height = args.height;

    Object.defineProperty(this, 'w', {
        get() { return width },
        set(value) { width = Math.max(value, 0); }
    });

    Object.defineProperty(this, 'h', {
        get() { return height },
        set(value) { height = Math.max(value, 0); }
    });
}

Bounds.prototype.toString = function()
{
    return `${this.x} ${this.y} ${this.w} ${this.h}`;
}

Bounds.prototype.copy = function()
{
    return new Bounds(this.x, this.y, this.w, this.h);
}

Bounds.prototype.cp = Bounds.prototype.copy;

/*
 * Width
 */

Object.defineProperty(Bounds.prototype, 'width', {
    get() { return this.w; },
    set(value) { this.w = value; }
});

Bounds.prototype.setWidth = function(width)
{
    if (typeof width === 'number') this.w = width;
    return this;
}

Bounds.prototype.setW = Bounds.prototype.setWidth;

/*
 * Height
 */

Object.defineProperty(Bounds.prototype, 'height', {
    get() { return this.h; },
    set(value) { this.h = value; }
});

Bounds.prototype.setHeight = function(height)
{
    if (typeof height === 'number') this.h = height;
    return this;
}

Bounds.prototype.setH = Bounds.prototype.setHeight;

/*
 * Width and Height
 */

Object.defineProperty(Bounds.prototype, 'wh', {
    get()
    {
        return new Point(this.w, this.h);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setWH(value);
        }
    }
});

Bounds.prototype.setWH = function(width, height)
{
    let args = parsePointArgs(width, height);

    this.w = args.x;
    this.h = args.y;
    return this;
}

/*
 * Center
 */

Object.defineProperty(Bounds.prototype, 'center', {
    get()
    {
        let x = this.x + (this.width / 2);
        let y = this.y + (this.height / 2);
        return new Point(x, y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setCenter(value);
        }
    }
});

Bounds.prototype.setCenter = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - (this.width / 2);
    this.y = args.y - (this.height / 2);
    return this;
}

Object.defineProperty(Bounds.prototype, 'c', {
    get() { return this.center; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setCenter(value);
        }
    }
});

Bounds.prototype.setC = Bounds.prototype.setCenter;

/*
 * The underscore versions of the property setters
 * below update the corresponding point while
 * anchoring down the opposing point in the bounds.
 * This lets the user adjust a particular point
 * while keeping the opposing point in place.
 *
 * Top Left
 */

Object.defineProperty(Bounds.prototype, 'tl_', {
    get() { return this.tl; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTL_(value);
        }
    }
});

Bounds.prototype.setTL_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    let anchorX = this.x + this.w;
    let anchorY = this.y;

    this.w = Math.max(anchorX - args.x, 0);
    this.h = Math.max(args.y - anchorY, 0);
    this.x = Math.min(anchorX - this.w, anchorX);
    return this;
}

Object.defineProperty(Bounds.prototype, 'tl', {
    get()
    {
        return new Point(this.x, this.y + this.height);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTL(value);
        }
    }
});

Bounds.prototype.setTL = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x;
    this.y = args.y - this.height;
    return this;
}

/*
 * Top Middle
 */

Object.defineProperty(Bounds.prototype, 'tm_', {
    get() { return this.tm },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTM_(value);
        }
    }
});

Bounds.prototype.setTM_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    /* Anchored to the bottom middle */
    this.h = Math.max(args.y - this.y, 0);
    return this;
}

Object.defineProperty(Bounds.prototype, 'tm', {
    get()
    {
        let x = this.x + (this.width / 2);
        let y = this.y + this.height;
        return new Point(x, y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTM(value);
        }
    }
});

Bounds.prototype.setTM = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - (this.width / 2);
    this.y = args.y - this.height;
    return this;
}

/*
 * Top Right
 */

Object.defineProperty(Bounds.prototype, 'tr_', {
    get() { return this.tr; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTR_(value);
        }
    }
});

Bounds.prototype.setTR_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.w = Math.max(args.x - this.x, 0);
    this.h = Math.max(args.y - this.y, 0);
    return this;
}

Object.defineProperty(Bounds.prototype, 'tr', {
    get()
    {
        let x = this.x + this.width;
        let y = this.y + this.height;
        return new Point(x, y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setTR(value);
        }
    }
});

Bounds.prototype.setTR = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - this.width;
    this.y = args.y - this.height;
    return this;
}

/*
 * Middle Right
 */

Object.defineProperty(Bounds.prototype, 'mr_', {
    get() { return this.mr; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setMR_(value);
        }
    }
});

Bounds.prototype.setMR_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    /* Anchored to the middle left. */
    this.w = Math.max(args.x - this.x, 0);
    return this;
}

Object.defineProperty(Bounds.prototype, 'mr', {
    get()
    {
        let x = this.x + this.width;
        let y = this.y + (this.height / 2);
        return new Point(x, y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setMR(value);
        }
    }
});

Bounds.prototype.setMR = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - this.width;
    this.y = args.y - (this.height / 2);
    return this;
}

/*
 * Bottom Right
 */

Object.defineProperty(Bounds.prototype, 'br_', {
    get() { return this.br; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBR_(value);
        }
    }
});

Bounds.prototype.setBR_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    let anchorX = this.x;
    let anchorY = this.y + this.h;

    this.w = Math.max(args.x - anchorX, 0);
    this.h = Math.max(anchorY - args.y, 0);
    this.y = anchorY - this.h;
    return this;
}

Object.defineProperty(Bounds.prototype, 'br', {
    get()
    {
        return new Point(this.x + this.width, this.y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBR(value);
        }
    }
});

Bounds.prototype.setBR = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - this.width;
    this.y = args.y;
    return this;
}

/*
 * Bottom Middle
 */

Object.defineProperty(Bounds.prototype, 'bm_', {
    get() { return this.bm; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBM_(value);
        }
    }
});

Bounds.prototype.setBM_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    /* Anchored to the top middle. */
    let anchorY = this.y + this.h;

    this.h = Math.max(anchorY - args.y, 0);
    this.y = anchorY - this.h;
    return this;
}

Object.defineProperty(Bounds.prototype, 'bm', {
    get()
    {
        return new Point(this.x + (this.width / 2), this.y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBM(value);
        }
    }
});

Bounds.prototype.setBM = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x - (this.width / 2);
    this.y = args.y;
    return this;
}

/*
 * Bottom Left
 */

Object.defineProperty(Bounds.prototype, 'bl_', {
    get() { return this.bl; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBL_(value);
        }
    }
});

Bounds.prototype.setBL_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    let anchorX = this.x + this.w;
    let anchorY = this.y + this.h;

    this.w = Math.max(anchorX - args.x, 0);
    this.h = Math.max(anchorY - args.y, 0);
    this.x = anchorX - this.w;
    this.y = anchorY - this.h;
    return this;
}

Object.defineProperty(Bounds.prototype, 'bl', {
    get()
    {
        return new Point(this.x, this.y);
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setBL(value);
        }
    }
});

Bounds.prototype.setBL = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x;
    this.y = args.y;
    return this;
}

/*
 * Middle Left
 */

Object.defineProperty(Bounds.prototype, 'ml_', {
    get() { return this.ml; },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setML_(value);
        }
    }
});

Bounds.prototype.setML_ = function(x, y)
{
    let args = parsePointArgs(x, y);

    /* Anchored to the middle right. */
    let anchorX = this.x + this.w;

    this.w = Math.max(anchorX - args.x, 0);
    this.x = anchorX - this.w;
    return this;
}

Object.defineProperty(Bounds.prototype, 'ml', {
    get()
    {
        return new Point(this.x, this.y + (this.height / 2));
    },
    set(value)
    {
        if ((value instanceof Point) ||
            (typeof value === 'string'))
        {
            this.setML(value);
        }
    }
});

Bounds.prototype.setML = function(x, y)
{
    let args = parsePointArgs(x, y);

    this.x = args.x;
    this.y = args.y - (this.height / 2);
    return this;
}

Bounds.prototype.expand = function(x, y, anchor)
{
    if ((typeof x == 'number') ||
        (typeof y == 'number'))
    {
        anchor = anchor || 'bl';

        let newWidth = Math.max(this.w + x, 0);
        let newHeight = Math.max(this.h + y, 0);

        x = newWidth - this.w;
        y = newHeight - this.h;

        this.w = newWidth;
        this.h = newHeight;

        if (anchor == 'c')
        {
            this.x -= (x / 2);
            this.y -= (y / 2);
        }
        else if (anchor == 'tl')
        {
            this.y -= y;
        }
        else if (anchor == 'tm')
        {
            this.x -= (x / 2);
            this.y -= y;
        }
        else if (anchor == 'tr')
        {
            this.x -= x;
            this.y -= y;
        }
        else if (anchor == 'mr')
        {
            this.x -= x;
            this.y -= (y / 2);
        }
        else if (anchor == 'br')
        {
            this.x -= x;
        }
        else if (anchor == 'bm')
        {
            this.x -= (x / 2);
        }
        else if (anchor == 'ml')
        {
            this.y -= (y / 2);
        }
        /*
         * (anchor == 'bl') leaves x and y where they are
         */
    }

    return this;
}


export const graphUtils =
{
    Point: Point,
    Bounds: Bounds
};

