$(function() {			
		   
	//-- window resize function-------
	
	function setDimensions() {
        var windowsHeight = $(window).height();
        $('.resize-image-js').css('height', windowsHeight + 'px');
    }
    setDimensions();
    $(window).resize(function() {
        setDimensions();
    });
	
	
	// $('.toggle-nav').click(function() {
	//	$('.right-nav').toggleClass('right');
	// });
	
			var hadrst = false;	
			$(".toggle-nav").click(function(event){
				event.stopPropagation();
				if(hadrst == false){
					$(".right-nav").addClass("right");
					$("body").addClass("overlay-bg");					
					hadrst = true;
				}else{
					$(".right-nav").removeClass("right");
					$("body").removeClass("overlay-bg");	
					hadrst = false;
				}		
			});	
			
		$(document).click(function(){
			hadrst = false;
			$(".right-nav").removeClass("right");
			$("body").removeClass("overlay-bg");
		});
		
	
		//sticky nav
            var navHeight = $('.header').outerHeight();
            $(window).on('scroll', function() {
                var posCurrent = $(this).scrollTop();
                if (posCurrent >= navHeight) {
                    $('body').addClass('stickyActive');
                } else {
                    $('body').removeClass('stickyActive');
                }
            });
           // console.log(navHeight);
	
});