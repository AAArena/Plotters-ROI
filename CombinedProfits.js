function newAAArenaPlottersROICombinedProfits() {

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        draw: draw
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let timeLineCoordinateSystem = newTimeLineCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    /* these are module specific variables: */

    let competition;

    let files;                           // Here we keep the history records to be ploted every time the Draw() function is called by the AAWebPlatform.
    let histories = new Map;                   // This is where the history records are stored before plotting.

    return thisObject;

    function initialize(pCompetition, pStorage, pDatetime, pTimePeriod, callBackFunction) {

        competition = pCompetition;

        datetime = pDatetime;
        timePeriod = pTimePeriod;

        files = pStorage.files;

        recalculate();
        recalculateScale();
        callBackFunction();

    }

    function getContainer(point) {

        let container;

        /* First we check if this point is inside this space. */

        if (this.container.frame.isThisPointHere(point) === true) {

            return this.container;

        } else {

            /* This point does not belong to this space. */

            return undefined;
        }

    }

    function setTimePeriod(pTimePeriod) {

        timePeriod = pTimePeriod;

        recalculate();

    }

    function setDatetime(newDatetime) {

        datetime = newDatetime;

    }

    function draw() {

        plotStartFinishLines();
        plotChart();

    }

    function recalculate() {    

        if (files === undefined) { return; }

        /*

        We are going to filter the records depending on the Time Period. We want that for a 1 min time peroid all the records appears on screen,
        but for higher periods, we will filter out some records, so that they do not overlap ever. 

        */

        let oneMin = 60000;
        let step = timePeriod / oneMin;

        for (let j = 0; j < competition.participants.length; j++) {

            let key = competition.participants[j].devTeam + "-" + competition.participants[j].bot;

            let file = files.get(key).getFile();

            let history = [];

            for (let i = 0; i < file.length; i = i + step) {

                let newHistoryRecord = {

                    date: Math.trunc(file[i][0] / 60000) * 60000 + 30000,
                    buyAvgRate: file[i][1],
                    sellAvgRate: file[i][2],
                    marketRate: file[i][3],
                    newPositions: file[i][4],
                    newTrades: file[i][5],
                    movedPositions: file[i][6],
                    profitsAssetA: file[i][7],
                    profitsAssetB: file[i][8],
                    combinedProfitsA: file[i][9],
                    combinedProfitsB: file[i][10]
                };

                history.push(newHistoryRecord);
            }

            histories.set(key, history);
        }
        thisObject.container.eventHandler.raiseEvent("History Changed", history);
    }

    function recalculateScale() {

        if (files === undefined) { return; } // We need the market file to be loaded to make the calculation.

        if (timeLineCoordinateSystem.maxValue > 0) { return; } // Already calculated.

        let minValue = {
            x: EARLIEST_DATE.valueOf(),
            y: 0
        };


        let maxYValue = getMaxValue();

        if (maxYValue < 10) { maxYValue = 10;}

        let maxValue = {
            x: MAX_PLOTABLE_DATE.valueOf(),
            y: nextPorwerOf10(maxYValue)
        };

        timeLineCoordinateSystem.initialize(
            minValue,
            maxValue,
            thisObject.container.frame.width,
            thisObject.container.frame.height
        );

        function getMaxValue() {

            let maxValue = 0;

            for (let j = 0; j < competition.participants.length; j++) {

                let key = competition.participants[j].devTeam + "-" + competition.participants[j].bot;

                let file = files.get(key).getFile();

                for (let i = 0; i < file.length; i++) {

                    let currentMax = file[i][10] * 2;

                    if (maxValue < currentMax) {
                        maxValue = currentMax;
                    }
                }
            }

            return maxValue;
        }
    }

    function plotStartFinishLines() {

        let startDatetime = new Date(competition.startDatetime);
        let finishDatetime = new Date(competition.startDatetime);

        let startPointDown = {
            x: startDatetime.valueOf(),
            y: 0
        };

        let startPointUp = {
            x: startDatetime.valueOf(),
            y: 0
        };

        startPointDown = timeLineCoordinateSystem.transformThisPoint(startPointDown);
        startPointDown = transformThisPoint(startPointDown, thisObject.container);

        startPointUp = timeLineCoordinateSystem.transformThisPoint(startPointUp);
        startPointUp.y = startPointUp.y - thisObject.container.frame.height;
        startPointUp = transformThisPoint(startPointUp, thisObject.container);

        browserCanvasContext.beginPath();

        browserCanvasContext.moveTo(startPointDown.x, startPointDown.y);
        browserCanvasContext.lineTo(startPointUp.x, candlePointUp.y);

        browserCanvasContext.closePath();

        browserCanvasContext.strokeStyle = 'rgba(27, 105, 7, 1)'; 
        browserCanvasContext.lineWidth = 1;
        browserCanvasContext.stroke();

        let finishPointDown = {
            x: finishDatetime.valueOf(),
            y: 0
        };

        let finishPointUp = {
            x: finishDatetime.valueOf(),
            y: 0
        };

        finishPointDown = timeLineCoordinateSystem.transformThisPoint(finishPointDown);
        finishPointDown = transformThisPoint(finishPointDown, thisObject.container);

        finishPointUp = timeLineCoordinateSystem.transformThisPoint(finishPointUp);
        finishPointUp.y = finishPointUp.y - thisObject.container.frame.height;
        finishPointUp = transformThisPoint(finishPointUp, thisObject.container);

        browserCanvasContext.beginPath();

        browserCanvasContext.moveTo(finishPointDown.x, finishPointDown.y);
        browserCanvasContext.lineTo(finishPointUp.x, candlePointUp.y);

        browserCanvasContext.closePath();

        browserCanvasContext.strokeStyle = 'rgba(27, 105, 7, 1)';
        browserCanvasContext.lineWidth = 1;
        browserCanvasContext.stroke();

    }

    function plotChart() {

        for (let j = 0; j < competition.participants.length; j++) {

            let key = competition.participants[j].devTeam + "-" + competition.participants[j].bot;

            let history = histories.get(key);

            for (let i = 0; i < history.length; i++) {

                record = history[i];

                let point = {
                    x: record.date,
                    y: record.combinedProfitsB 
                };

                point = timeLineCoordinateSystem.transformThisPoint(point);

                point.y = point.y - thisObject.container.frame.height / 2;

                point = transformThisPoint(point, thisObject.container);

                

                if (point.x < viewPort.visibleArea.bottomLeft.x || point.x > viewPort.visibleArea.bottomRight.x) { continue; }

                point = viewPort.fitIntoVisibleArea(point);

                let isCurrentRecord = false;

                if (datetime !== undefined) {
                    let dateValue = datetime.valueOf();
                    if (dateValue >= record.date - timePeriod / 2 && dateValue <= record.date + timePeriod / 2 - 1) {
                        isCurrentRecord = true;
                    }
                }

                let opacity = '0.2';

                let radius = 3;

                browserCanvasContext.lineWidth = 1;

                /* Circles */

                browserCanvasContext.beginPath();

                browserCanvasContext.strokeStyle = 'rgba(27, 105, 7, ' + opacity + ')';

                if (isCurrentRecord === false) {
                    browserCanvasContext.fillStyle = 'rgba(64, 217, 26, ' + opacity + ')';
                } else {
                    browserCanvasContext.fillStyle = 'rgba(255, 233, 31, ' + opacity + ')';  /* highlight the current record */
                }

                browserCanvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2, true);
                browserCanvasContext.closePath();

                if (point.x < viewPort.visibleArea.topLeft.x + 50 || point.x > viewPort.visibleArea.bottomRight.x - 50) {/*we leave this history without fill. */ } else {
                    browserCanvasContext.fill();
                }

                browserCanvasContext.stroke();

            }
        }
    }

    function onZoomChanged(event) {

    }

    function onDragFinished() {

    }
}

