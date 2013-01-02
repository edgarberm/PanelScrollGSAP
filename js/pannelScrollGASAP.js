/**
 *
 * @author Edgar Bermejo 
 *
 *	@BuiltByEdgar
 * 
 * HTML5 PANNEL SCROLL GSAP
 *
 */
	
 	var container = document.getElementById("container");
 	var panelCount;
 	var currentPanelIndex = 0;
 	var x1;
	var x2;
	var t1;
	var t2;
	var startX;
	var offsetX = 0;
	var gt = new getTimer();


	// INIT

	function setPannels(pannelsArray)
	{
		panelCount = pannelsArray.length;

		window.onmousedown = startDrag;
	}

	function startDrag(event)
	{
	    event.preventDefault();
	    window.onmousedown = null;
	    window.onmousemove = doDrag;
	    window.onmouseup = stopDrag;

	    startX = event.pageX;
		offsetX = container.style.left;
		x1 = x2 = event.pageX;
		t1 = t2 = gt.elapsed();
	}

	function doDrag(event)
	{
		event.preventDefault();

		if(!offsetX)
		{
			container.style.left = offsetX + event.pageX - startX + "px";
		}
		else
		{
		    container.style.left = parseInt(offsetX) + event.pageX - startX + "px";
		}
		
	}

	function stopDrag(event)
	{
	    window.onmousemove = null;
	    window.onmouseup = null;
	    window.onmousedown = startDrag;

	    var elapsedTime = (gt.elapsed() - t2) / 1000;
		var xVelocity = (event.pageX - x2) / elapsedTime;

		if (currentPanelIndex > 0 && (xVelocity > 20 || container.style.right > (currentPanelIndex - 0.5) * -600 + container.style.right)) 
		{
			currentPanelIndex--;
			console.log("MENOS: " + currentPanelIndex);
		} 
		else if (currentPanelIndex < panelCount - 1 && (xVelocity < -20 || container.style.right < (currentPanelIndex + 0.5) * -600 + container.style.right)) 
		{
			currentPanelIndex++;
			console.log("MAS: " + currentPanelIndex);
		}
		
		TweenLite.to(container, 0.7, {css:{left: currentPanelIndex * -600 + container.style.right}});
	}




	function getTimer(init, precision) 
	{
		var start = time = new Date(init || null).valueOf(),
		precision = precision || 100;

		setInterval(function () { time += precision; }, precision);

		this.elapsed = function() { return time - start; };
	}


