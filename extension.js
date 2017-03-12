const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

const refreshTime = 1.0;

let button, timeout;
let label;
let lastCount = 0, lastCountUp = 0;

function init() {
    button = new St.Bin({
        style_class: 'panel-button',
        reactive: true,
        can_focus: true,
        x_fill: true,
        y_fill: false,
        track_hover: true
    });

    label = new St.Label({
        text: '---',
        style_class: 'simplenetspeed-label'
    });

    button.set_child(label);
}

function parseStat() {
    try {
        let input_file = Gio.file_new_for_path('/proc/net/dev');
        let fstream = input_file.read(null);
        let dstream = Gio.DataInputStream.new(fstream);

        let count = 0;
        let countUp = 0;
        let line;
        while (line = dstream.read_line(null)) {
            line = String(line);
            line = line.trim();
            let fields = line.split(/\W+/);
            if (fields.length<=2) break;

            if (fields[0] != "lo" && !isNaN(parseInt(fields[1]))) {
                count = count + parseInt(fields[1]) + parseInt(fields[9]);
                countUp = countUp + parseInt(fields[9]);
            }
        }
        fstream.close(null);

        if (lastCount === 0) lastCount = count;
        if (lastCountUp === 0) lastCountUp = countUp;

        let speed = (count - lastCount) / refreshTime;
        let speedUp = (countUp - lastCountUp) / refreshTime;
        let speedDown = speed - speedUp;

        let txtSpeedDown = String((speedDown/1000).toFixed(0));
        let txtSpeedUp = String((speedUp/1000).toFixed(0));
        label.set_text("↓ " + txtSpeedDown + " KB/s   ↑ " + txtSpeedUp + " KB/s   ∑ " + sizeToString(count));

        lastCount = count;
        lastCountUp = countUp;
    } catch (e) {
        label.set_text(e.message);
    }

    return true;
}

function sizeToString(amount){
    let speed_map = ["B", "KB", "MB", "GB"];

    let unit = 0;
    while (amount >= 1000) { // 1M=1024K, 1MB/s=1000MB/s
        amount /= 1000;
        ++unit;
    }

    let digits;
    if (amount >= 100) // 100MB 100KB 200KB
        digits = 0;
    else if (amount >= 10) // 10MB 10.2
        digits = 1;
    else
        digits = 2;
    return String(amount.toFixed(digits)) + " " + speed_map[unit];
}

function enable() {
    Main.panel._rightBox.insert_child_at_index(button, 0);
    timeout = Mainloop.timeout_add_seconds(refreshTime, parseStat);
}

function disable() {
    Mainloop.source_remove(timeout);
    Main.panel._rightBox.remove_child(button);
}
