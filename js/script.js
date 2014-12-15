/*
  Author: Yuval Greenfield (http://uberpython.wordpress.com) 
 
  You can save the HTML file and use it locally btw like so:
    file:///wherever/index.html?/r/aww
 
  Favicon by Double-J designs http://www.iconfinder.com/icondetails/68600/64/_icon
  HTML based on http://demo.marcofolio.net/fullscreen_image_slider/
  Author of slideshow base :      Marco Kuiper (http://www.marcofolio.net/)
*/

// TODO: refactor all the globals to use the rp object's namespace.
var rp = {};

// Speed of the animation
var animationSpeed = 1000;
var shouldAutoNextSlide = true;
var timeToNextSlide = 6 * 1000;
var cookieDays = 300;

// Variable to store the images we need to set as background
// which also includes some text and url's.
var photos = [];
var photosetURL = "not initialized";
var nextPage = 0;

// 0-based index to set which picture to show first
// init to -1 until the first image is loaded
var activeIndex = -1;
var unrestricted = true;

// IE doesn't have indexOf, wtf...
if (!Array.indexOf) {
    Array.prototype.indexOf = function (obj) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}

// IE doesn't have console.log and fails, wtf...
// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function () {
    log.history = log.history || []; // store logs to an array for reference
    log.history.push(arguments);
    if (this.console) {
        console.log(Array.prototype.slice.call(arguments));
    }
};

$(function () {

    $("#subredditUrl").text("Loading Slideshow");
    $("#navboxTitle").text("Loading Slideshow");

    fadeoutWhenIdle = true;
    var setupFadeoutOnIdle = function () {
        $('.fadeOnIdle').fadeTo('fast', 0);
        var navboxVisible = false;
        var fadeoutTimer = null;
        var fadeoutFunction = function () {
            navboxVisible = false;
            if (fadeoutWhenIdle) {
                $('.fadeOnIdle').fadeTo('slow', 0);
            }
        };
        $("body").mousemove(function () {
            if (navboxVisible) {
                clearTimeout(fadeoutTimer);
                fadeoutTimer = setTimeout(fadeoutFunction, 2000);
                return;
            }
            navboxVisible = true;
            $('.fadeOnIdle').fadeTo('fast', 1);
            fadeoutTimer = setTimeout(fadeoutFunction, 2000);
        });
    };
    // this fadeout was really inconvenient on mobile phones
    // and instead the minimize buttons should be used.
    //setupFadeoutOnIdle();

    var nextSlideTimeoutId = null;

    var loadingNextImages = false;

    function nextSlide() {
        if(!unrestricted) {
            for(var i = activeIndex + 1; i < photos.length; i++) {
                if (!photos[i].restrict) {
                    return startAnimation(i);
                }
            }
        }
        if (isLastImage(activeIndex) && !loadingNextImages) {
            // the only reason we got here and there aren't more pictures yet
            // is because there are no more images to load, start over
            return startAnimation(0);
        }
        startAnimation(activeIndex + 1);
    }
    function prevSlide() {
        if(!unrestricted) {
            for(var i = activeIndex - 1; i > 0; i--) {
                if (!photos[i].restricted) {
                    return startAnimation(i);
                }
            }
        }
        startAnimation(activeIndex - 1);
    }

    
    var autoNextSlide = function () {
        if (shouldAutoNextSlide) {
            // startAnimation takes care of the setTimeout
            nextSlide();
        }
    };

    $("#pictureSlider").touchwipe({
        // wipeLeft means the user moved his finger from right to left.
        wipeLeft: function () {
            nextSlide();
        },
        wipeRight: function () {
            prevSlide();
        },
        wipeUp: function () {
            nextSlide();
        },
        wipeDown: function () {
            prevSlide();
        },
        min_move_x: 20,
        min_move_y: 20,
        preventDefaultEvents: false
    });

    var OPENSTATE_ATTR = "data-openstate";
    $('.collapser').click(function () {
        var state = $(this).attr(OPENSTATE_ATTR);
        if (state === "open") {
            // close it
            $(this).text("+");
            // move to the left just enough so the collapser arrow is visible
            var arrowLeftPoint = $(this).position().left;
            $(this).parent().animate({
                left: "-" + arrowLeftPoint + "px"
            });
            $(this).attr(OPENSTATE_ATTR, "closed");
        } else {
            // open it
            $(this).text("-");
            $(this).parent().animate({
                left: "0px"
            });
            $(this).attr(OPENSTATE_ATTR, "open");
        }
    });

    // maybe checkout http://engineeredweb.com/blog/09/12/preloading-images-jquery-and-javascript/ for implementing the old precache
    var cache = [];
    // Arguments are image paths relative to the current page.
    var preLoadImages = function () {
        var args_len = arguments.length;
        for (var i = args_len; i--;) {
            var cacheImage = document.createElement('img');
            cacheImage.src = arguments[i];
            cache.push(cacheImage);
        }
    };

    var setCookie = function (c_name, value, exdays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + exdays);
        var c_value = escape(value) + ((exdays === null) ? "" : "; expires=" + exdate.toUTCString());
        document.cookie = c_name + "=" + c_value;
    };

    var getCookie = function (c_name) {
        var i, x, y;
        var cookiesArray = document.cookie.split(";");
        for (i = 0; i < cookiesArray.length; i++) {
            x = cookiesArray[i].substr(0, cookiesArray[i].indexOf("="));
            y = cookiesArray[i].substr(cookiesArray[i].indexOf("=") + 1);
            x = x.replace(/^\s+|\s+$/g, "");
            if (x === c_name) {
                return unescape(y);
            }
        }
    };

    var resetNextSlideTimer = function () {
        clearTimeout(nextSlideTimeoutId);
        nextSlideTimeoutId = setTimeout(autoNextSlide, timeToNextSlide);
    };

    var shouldAutoNextSlideCookie = "shouldAutoNextSlideCookie";
    var updateAutoNext = function () {
        var shouldAutoNextSlide = $("#autoNextSlide").is(':checked');
        setCookie(shouldAutoNextSlideCookie, shouldAutoNextSlide, cookieDays);
        resetNextSlideTimer();
    };

    var restrictedCookie = "restrictedCookie";
    var updateRestricted= function () {
        var restricted = $("#restricted").is(':checked');
        setCookie(restrictedCookie, restricted, cookieDays);
    };

    var initState = function () {
        var restrictedByCookie = getCookie(restrictedCookie);
        var restricted;
        
        if (restrictedByCookie === undefined) {
            restricted = false;
        } else {
            restricted = (restrictedByCookie === "true");
            $("#restricted").prop("checked", restricted);
        }
        $('#restricted').change(updateRestricted);

        var autoByCookie = getCookie(shouldAutoNextSlideCookie);
        if (autoByCookie === undefined) {
            updateAutoNext();
        } else {
            var shouldAutoNextSlide = (autoByCookie === "true");
            $("#autoNextSlide").prop("checked", shouldAutoNextSlide);
        }
        $('#autoNextSlide').change(updateAutoNext);

        var timeToNextSlide;
        var updateTimeToNextSlide = function () {
            var val = $('#timeToNextSlide').val();
            timeToNextSlide = parseFloat(val) * 1000;
            setCookie(timeToNextSlideCookie, val, cookieDays);
        };

        var timeToNextSlideCookie = "timeToNextSlideCookie";
        var timeByCookie = getCookie(timeToNextSlideCookie);
        if (timeByCookie === undefined) {
            updateTimeToNextSlide();
        } else {
            timeToNextSlide = parseFloat(timeByCookie) * 1000;
            $('#timeToNextSlide').val(timeByCookie);
        }

        $('#timeToNextSlide').keyup(updateTimeToNextSlide);
        
        $('#prevButton').click(prevSlide);
        $('#nextButton').click(nextSlide);
    };

    var addNumberButton = function (numberButton) {
        var navboxUls = $(".navbox ul");
        var thisNavboxUl = navboxUls[navboxUls.length - 1];

        var newListItem = $("<li />").appendTo(thisNavboxUl);
        numberButton.appendTo(newListItem);

        // so li's have a space between them and can word-wrap in the box
        navboxUls.append(document.createTextNode(' '));
    };

    var addImageSlide = function (url, title, editLink, restrict) {
        var pic = {
            "title": title,
            "cssclass": "clouds",
            "image": url,
            "text": "",
            "url": url,
            "urltext": 'View picture',
            "editLink": editLink,
            "restrict": restrict
        };

        preLoadImages(pic.url);
        photos.push(pic);

        var i = photos.length - 1;
        var numberButton = $("<a />").html(i + 1)
            .data("index", i)
            .attr("title", photos[i].title)
            .attr("id", "numberButton" + (i + 1));
        if(restricted) {
            numberButton.addClass("restricted");
        }
        numberButton.click(function () {
            showImage($(this));
        });
        numberButton.addClass("numberButton");
        addNumberButton(numberButton);
    };
    
    // More info: http://stackoverflow.com/questions/302122/jquery-event-keypress-which-key-was-pressed
    // http://stackoverflow.com/questions/1402698/binding-arrow-keys-in-js-jquery

    var SPACE = 32;
    var PAGEUP = 33;
    var PAGEDOWN = 34;
    var A_KEY = 65;
    var C_KEY = 67;
    var T_KEY = 84;
    var ARROW = {
        left: 37,
        up: 38,
        right: 39,
        down: 40
    };
    // Register keyboard events on the whole document
    $(document).keyup(function (e) {
        if(e.ctrlKey) {
            // ctrl key is pressed so we're most likely switching tabs or doing something
            // unrelated to redditp UI
            return;
        }

        var code = (e.keyCode ? e.keyCode : e.which);

        switch (code) {
            case C_KEY:
                $('#controlsDiv .collapser').click();
                break;
            case T_KEY:
                $('#titleDiv .collapser').click();
                break;
            case A_KEY:
                $("#autoNextSlide").prop("checked", !$("#autoNextSlide").is(':checked'));
                updateAutoNext();
                break;
                
            case PAGEUP:
            case ARROW.left:
            case ARROW.up:
                return prevSlide();
            case PAGEDOWN:
            case ARROW.right:
            case ARROW.down:
            case SPACE:
                return nextSlide();
        }
    });

    //
    // Shows an image and plays the animation
    //
    var showImage = function (docElem) {
        // Retrieve the index we need to use
        var imageIndex = docElem.data("index");

        startAnimation(imageIndex);
    };

    var isLastImage = function(imageIndex) {
        if(unrestricted) {
            return (imageIndex === photos.length - 1);
        } else {
            // look for remaining sfw images
            for(var i = imageIndex + 1; i < photos.length; i++) {
                if(!photos[i].restrict) {
                    return false;
                }
            }
            return true;
        }
    };
    //
    // Starts the animation, based on the image index
    //
    // Variable to store if the animation is playing or not
    var isAnimating = false;
    var startAnimation = function (imageIndex) {
        resetNextSlideTimer();

        // If the same number has been chosen, or the index is outside the
        // photos range, or we're already animating, do nothing
        if (activeIndex === imageIndex || imageIndex > photos.length - 1 || imageIndex < 0 || isAnimating || photos.length === 0) {
            return;
        }

        isAnimating = true;
        animateNavigationBox(imageIndex);
        slideBackgroundPhoto(imageIndex);

        // Set the active index to the used image index
        activeIndex = imageIndex;

        if (isLastImage(activeIndex)) {
            getNextImages();
        }
    };

    var toggleNumberButton = function (imageIndex, turnOn) {
        var numberButton = $('#numberButton' + (imageIndex + 1));
        if (turnOn) {
            numberButton.addClass('active');
        } else {
            numberButton.removeClass('active');
        }
    };

    //
    // Animate the navigation box
    //
    var animateNavigationBox = function (imageIndex) {
        var photo = photos[imageIndex];

        $('#navboxTitle').html(photo.title);
        $('#navboxLink').attr('href', photo.url).attr('title', photo.title);
        $('#navboxEditLink').attr('href', photo.editLink).attr('title', "Edit the photo");

        toggleNumberButton(activeIndex, false);
        toggleNumberButton(imageIndex, true);
    };

    //
    // Slides the background photos
    //
    var slideBackgroundPhoto = function (imageIndex) {

        // Retrieve the accompanying photo based on the index
        var photo = photos[imageIndex];

        // Create a new div and apply the CSS
        var cssMap = Object();
        cssMap['display'] = "none";
        cssMap['background-image'] = "url(" + photo.image + ")";
        cssMap['background-repeat'] = "no-repeat";
        cssMap['background-size'] = "contain";
        cssMap['background-position'] = "center";

        //var imgNode = $("<img />").attr("src", photo.image).css({opacity:"0", width: "100%", height:"100%"});
        var divNode = $("<div />").css(cssMap).addClass(photo.cssclass);
        //imgNode.appendTo(divNode);
        divNode.prependTo("#pictureSlider");

        $("#pictureSlider div").fadeIn(animationSpeed);
        var oldDiv = $("#pictureSlider div:not(:first)");
        oldDiv.fadeOut(animationSpeed, function () {
            oldDiv.remove();
            isAnimating = false;
        });
    };

    var failCleanup = function() {
        if (photos.length > 0) {
            // already loaded images, don't ruin the existing experience
            return;
        }
        
        // remove "loading" title
        $('#navboxTitle').text('');
        
        // display alternate recommendations
        $('#recommend').css({'display':'block'});
    };
    
    var getNextImages = function () {
        loadingNextImages = true;
        
        var failedAjax = function (data) {
            alert("Failed ajax, maybe a bad url? Sorry about that :(");
            failCleanup();
        };
        
        var handleData = function (data) {
            var display = $(data).find("webAlbums").find("photos").find("display") ;
            var photoSet = display.find("photoList").find("photo");
            
            var albumTitle = display.find("album").find("name").text();
            $(document).attr('title', "WebAlbums slideshow - "+albumTitle);
            
            if (photoSet.length === 0) {
                return;
            }

            photoSet.each(function (idx) {
                var imageId = $(this).find("details").find("photoId").attr("id");
                var title = $(this).find("details").find("description").text();
                
                $(this).find("details").find("tagList").find("*").each(function(i) {
                    title += " " + $(this).find("name").text();
                });
                
                var restrict = false;
                
                foundOneImage = true;
                addImageSlide("/WebAlbums3.5-dev/Images?mode=SHRINK&width=800&id="+imageId, title, 
                              "/WebAlbums3.5-dev/Photos?action=EDIT&id="+imageId, restrict);
            });
            
            if (!foundOneImage) {
                alert("Sorry, no displayable images found in that url :(");
            }

            // show the first image
            if (activeIndex === -1) {
                startAnimation(0);
            }
            
            loadingNextImages = false;
            nextPage += 1;
        };
        
        // I still haven't been able to catch jsonp 404 events so the timeout
        // is the current solution sadly.
        $.ajax({
            url: (photosetURL + "&page="+nextPage),
            dataType: 'xml',
            success: handleData,
            error: failedAjax,
            //complete: doneAjaxReq,
            404: failedAjax,
            timeout: 5000
        });
    };

    var setupURL = function() {
        // http://stackoverflow.com/a/5448635/341106
        var getSearchParameters = function () {
            var prmstr = window.location.search.substr(1);
            return prmstr !== null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
        };

        var transformToAssocArray = function (prmstr) {
            var params = {};
            var prmarr = prmstr.split("&");
            for (var i = 0; i < prmarr.length; i++) {
                var tmparr = prmarr[i].split("=");
                params[tmparr[0]] = tmparr[1];
            }
            return params;
        };

        var params = getSearchParameters();
        if (params.albumId !== undefined) {
            photosetURL = "Photos?album=" + params.albumId;
        } else if (params.tagId !== undefined) {
            photosetURL = "Tags?tagId=" + params.tagId;
        }
        photosetURL = "/WebAlbums3.5-dev/"+photosetURL;
    };
    
    initState();
    setupURL();

    // if ever found even 1 image, don't show the error
    var foundOneImage = false;

    getNextImages();
});
