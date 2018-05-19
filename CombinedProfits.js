function newAAArenaPlottersROICombinedProfits() {

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        draw: draw,
        payload: []
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

    let competitorsSequences;

    let updatedFilesEventsReceived = 0;

    return thisObject;

    function initialize(pCompetition, pStorage, pDatetime, pTimePeriod, callBackFunction) {

        competition = pCompetition;
        competitorsSequences = pStorage.competitorsSequences;

        datetime = pDatetime;
        timePeriod = pTimePeriod;

        recalculate();
        recalculateScale();

        viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);

        /* Create the Payload structure */

        for (let k = 0; k < competition.participants.length; k++) {

            let participant = competition.participants[k];

            let payload = {
                profile: {
                    position: {
                        x: 0,
                        y: 0
                    },
                    visible: false
                }
            }

            thisObject.payload.push(payload);
        }

        for (let k = 0; k < competition.participants.length; k++) {

            let fileSequence = competitorsSequences[k][0];  // Only the first dataSet is considered for now.

            fileSequence.eventHandler.listenToEvent("Files Updated", onFilesUpdated); // Only the first sequence is supported right now.

        }

        callBackFunction(GLOBAL.DEFAULT_OK_RESPONSE);
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

    function onFilesUpdated() {

        updatedFilesEventsReceived++;

        if (updatedFilesEventsReceived === competition.participants.length) {

            recalculate();
            updatedFilesEventsReceived = 0;
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

    function onOffsetChanged() {

        if (Math.random() * 100 > 95) {

            recalculate()
        };

    }

    function recalculate() {    

        if (competitorsSequences === undefined) { return; }

        /*

        We are going to filter the records depending on the Time Period. We want that for a 1 min time peroid all the records appears on screen,
        but for higher periods, we will filter out some records, so that they do not overlap ever. 

        */

        let oneMin = 60000;
        let step = timePeriod / oneMin;

        for (let k = 0; k < competition.participants.length; k++) {

            let fileSequence = competitorsSequences[k][0];  // Only the first dataSet is considered for now.

            competition.participants[k].plotElements = [];

            let maxSequence = fileSequence.getFilesLoaded();

            for (let j = 0; j < maxSequence; j++) {

                let file = fileSequence.getFile(j);

                let oneMin = 60000;
                let step = timePeriod / oneMin;

                /* First the small balls */

                for (let i = 0; i < file.length; i = i + step) {

                    let newHistoryRecord = {

                        date: Math.trunc(file[i][0] / 60000) * 60000 + 30000,
                        buyAvgRate: file[i][1],
                        sellAvgRate: file[i][2],

                        lastSellRate: file[i][3],
                        sellExecRate: file[i][4],
                        lastBuyRate: file[i][5],
                        buyExecRate: file[i][6],

                        marketRate: file[i][7],
                        newPositions: file[i][8],
                        newTrades: file[i][9],
                        movedPositions: file[i][10],
                        profitsAssetA: file[i][11],
                        profitsAssetB: file[i][12],
                        combinedProfitsA: file[i][13],
                        combinedProfitsB: file[i][14],

                        messageRelevance: file[i][15],
                        messageTitle: file[i][16],
                        messageBody: file[i][17]
                    };

                    competition.participants[k].plotElements.push(newHistoryRecord);
                }
            }
        }
    }

    function recalculateScale() {

        if (competitorsSequences === undefined) { return; } // We need the market file to be loaded to make the calculation.

        if (timeLineCoordinateSystem.maxValue > 0) { return; } // Already calculated.

        let minValue = {
            x: EARLIEST_DATE.valueOf(),
            y: 0
        };

        let maxValue = {
            x: MAX_PLOTABLE_DATE.valueOf(),
            y: nextPorwerOf10(USDT_BTC_HTH)
        };


        timeLineCoordinateSystem.initialize(
            minValue,
            maxValue,
            thisObject.container.frame.width,
            thisObject.container.frame.height
        );
    }

    function plotStartFinishLines() {

        let startDatetime = new Date(competition.startDatetime);
        let finishDatetime = new Date(competition.finishDatetime);

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

        if (startPointUp.x > viewPort.visibleArea.bottomLeft.x && startPointUp.x < viewPort.visibleArea.bottomRight.x)  {

            startPointDown = viewPort.fitIntoVisibleArea(startPointDown);
            startPointUp = viewPort.fitIntoVisibleArea(startPointUp);

            browserCanvasContext.beginPath();

            browserCanvasContext.moveTo(startPointDown.x, startPointDown.y);
            browserCanvasContext.lineTo(startPointUp.x, startPointUp.y);

            browserCanvasContext.closePath();

            browserCanvasContext.strokeStyle = 'rgba(100, 10, 10, 0.5)';
            browserCanvasContext.lineWidth = 2;
            browserCanvasContext.stroke();

        }


        /* Here we draw the finish line. */

        const TOTAL_SQUARES_TALL = ONE_DAY_IN_MILISECONDS / timePeriod * 10;
        const SQUARE_SIDE = thisObject.container.frame.height / TOTAL_SQUARES_TALL;

        let paintThis = true;

        for (i = 0; i < 3; i++) {

            for (j = 0; j < TOTAL_SQUARES_TALL; j++) {

                let finishPointDown = {
                    x: finishDatetime.valueOf(),
                    y: 0
                };

                let finishPointUp = {
                    x: finishDatetime.valueOf(),
                    y: 0
                };

                finishPointDown = timeLineCoordinateSystem.transformThisPoint(finishPointDown);

                finishPointDown.x = finishPointDown.x + SQUARE_SIDE * i;
                finishPointDown.y = finishPointDown.y - SQUARE_SIDE * j;

                finishPointDown = transformThisPoint(finishPointDown, thisObject.container);

                finishPointUp = timeLineCoordinateSystem.transformThisPoint(finishPointUp);

                finishPointUp.x = finishPointUp.x + SQUARE_SIDE * i + SQUARE_SIDE;
                finishPointUp.y = finishPointUp.y - SQUARE_SIDE * j - SQUARE_SIDE;

                finishPointUp = transformThisPoint(finishPointUp, thisObject.container);

                if (finishPointUp.x < viewPort.visibleArea.bottomLeft.x || finishPointDown.x > viewPort.visibleArea.bottomRight.x) { continue; }

                finishPointDown = viewPort.fitIntoVisibleArea(finishPointDown);
                finishPointUp = viewPort.fitIntoVisibleArea(finishPointUp);

                browserCanvasContext.beginPath();

                browserCanvasContext.moveTo(finishPointDown.x, finishPointDown.y);
                browserCanvasContext.lineTo(finishPointUp.x, finishPointDown.y);
                browserCanvasContext.lineTo(finishPointUp.x, finishPointUp.y);
                browserCanvasContext.lineTo(finishPointDown.x, finishPointUp.y);

                browserCanvasContext.closePath();

                /*
                browserCanvasContext.strokeStyle = 'rgba(100, 100, 100, 1)';
                browserCanvasContext.lineWidth = 1;
                browserCanvasContext.stroke();
                */

                if (paintThis === true) {

                    browserCanvasContext.fillStyle = 'rgba(100, 100, 100, ' + (0.6 - i / 5) + ')';
                    browserCanvasContext.fill();

                }

                if (paintThis === true) { paintThis = false; } else { paintThis = true;}
            }

            if (paintThis === true) { paintThis = false; } else { paintThis = true; }
        }
    }

    function plotChart() {

        for (let k = 0; k < competition.participants.length; k++) {

            let point = {
                x: 0,
                y: 0
            };

            let upLabel = "";

            let participant = competition.participants[k];
            let plotElements = participant.plotElements;

            for (let i = 0; i < plotElements.length; i++) {

                record = plotElements[i];

                point = {
                    x: record.date,
                    y: record.combinedProfitsB 
                };

                upLabel = "ROI: " + Math.trunc(record.combinedProfitsB * 10000) / 10000 + " %";

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

                let radius = 6;

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

                /* Since there is at least some point plotted, then the profile should be visible. */

                thisObject.payload[k].profile.visible = true;

                /* Image */

                if (participant.profilePicture !== undefined) {

                    let imageId = participant.devTeam + "." + participant.profilePicture;
                    imageSize = 8;

                    if (imageId !== undefined) {

                        let image = document.getElementById(imageId);

                        if (image !== null) {

                            browserCanvasContext.drawImage(image, point.x - imageSize / 2, point.y - imageSize / 2, imageSize, imageSize);

                        }
                    }
                }
            }

            /*
 
            We replace the coordinate of the profile point so that whoever has a reference to it, gets the new position.
            We will use the last point plotted on screen as the profilePoint.
 
            */

            thisObject.payload[k].profile.position.x = point.x;
            thisObject.payload[k].profile.position.y = point.y;
            thisObject.payload[k].profile.upLabel = upLabel;
        }

    }
}

