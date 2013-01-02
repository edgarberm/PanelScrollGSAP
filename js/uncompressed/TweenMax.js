/**
 * VERSION: beta 1.21
 * DATE: 2012-05-15
 * JavaScript (ActionScript 3 and 2 also available)
 * UPDATES AND DOCS AT: http://www.greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, easing.EasePack, plugins.CSSPlugin, plugins.RoundPropsPlugin
 *
 * Copyright (c) 2008-2012, GreenSock. All rights reserved. 
 * This work is subject to the terms in http://www.greensock.com/terms_of_use.html or for 
 * corporate Club GreenSock members, the software agreement that was issued with the corporate 
 * membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/

(window._gsQueue || (window._gsQueue = [])).push( function() {

/*
 * ----------------------------------------------------------------
 * TweenMax
 * ----------------------------------------------------------------
 */
	_gsRequire("TweenMax", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {
		
		var TweenMax = function(target, duration, vars) {
				TweenLite.call(this, target, duration, vars);
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo == true);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._dirty = true; //ensures that if there is any repeat, the totalDuration will get recalculated to accurately report it.
			},
			p = TweenMax.prototype = TweenLite.to({}, 0.1, {}),
			_blankArray = [];
			
		p.constructor = TweenMax;
		p.kill()._gc = false;
		TweenMax.killTweensOf = TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
		TweenMax.getTweensOf = TweenLite.getTweensOf;		
	
		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo == true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TweenLite.invalidate.call(this);
		};
		
		p.updateTo = function(vars, resetDuration) {
			var curRatio = this.ratio, p;
			if (resetDuration) if (this.timeline != null) if (this._startTime < this._timeline._time) {
				this._startTime = this._timeline._time;
				this._uncache(false);
				if (this._gc) {
					this._enabled(true, false);
				} else {
					this._timeline.insert(this, this._startTime - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			for (p in vars) {
				this.vars[p] = vars[p];
			}
			if (this._initted) {
				if (resetDuration) {
					this._initted = false;
				} else {
					if (this._notifyPluginsOfEnabled && this._firstPT) {
						TweenLite._onPluginEvent("_onDisable", this); //in case a plugin like MotionBlur must perform some cleanup tasks
					}
					if (this._time / this._duration > 0.998) { //if the tween has finished (or come extremely close to finishing), we just need to rewind it to 0 and then render it again at the end which forces it to re-initialize (parsing the new vars). We allow tweens that are close to finishing (but haven't quite finished) to work this way too because otherwise, the values are so small when determining where to project the starting values that binary math issues creep in and can make the tween appear to render incorrectly when run backwards. 
						var prevTime = this._time;
						this.render(0, true, false);
						this._initted = false;
						this.render(prevTime, true, false);
					} else if (this._time > 0) {
						this._initted = false;
						this._init();
						var inv = 1 / (1 - curRatio),
							pt = this._firstPT, endValue;
						while (pt) {
							endValue = pt.s + pt.c; 
							pt.c *= inv;
							pt.s = endValue - pt.c;
							pt = pt._next;
						}
					}
				}
			}
			return this;
		};
				
		p.render = function(time, suppressEvents, force) {
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(), 
				prevTime = this._time,
				prevTotalTime = this._totalTime, 
				prevCycle = this._cycle, 
				isComplete, callback, pt;
			if (time >= totalDur) {
				this._totalTime = totalDur;
				this._cycle = this._repeat;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				} else {
					this._time = this._duration;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				}
				if (!this._reversed) {
					isComplete = true;
					callback = "onComplete";
				}
				if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) {
						force = true;
					}
					this._rawPrevTime = time;
				}
				
			} else if (time <= 0) {
				this._totalTime = this._time = this._cycle = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTotalTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (this._rawPrevTime >= 0) {
							force = true;
						}
						this._rawPrevTime = time;
					}
				} else if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;
				
				if (this._repeat !== 0) {
					var cycleDuration = this._duration + this._repeatDelay;
					this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
					if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
						this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
					}
					this._time = this._totalTime - (this._cycle * cycleDuration);
					if (this._yoyo) if ((this._cycle & 1) !== 0) {
						this._time = this._duration - this._time;
					}
					if (this._time > this._duration) {
						this._time = this._duration;
					} else if (this._time < 0) {
						this._time = 0;
					}
				}
				
				if (this._easeType) {
					var r = this._time / this._duration, 
						type = this._easeType, 
						pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}
					
					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (this._time / this._duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}
					
				} else {
					this.ratio = this._ease.getRatio(this._time / this._duration);
				}
				
			}
				
			if (prevTime === this._time && !force) {
				return;
			} else if (!this._initted) {
				this._init();
				if (!isComplete && this._time) { //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
					this.ratio = this._ease.getRatio(this._time / this._duration);
				}
			}
			
			
			
			if (!this._active) if (!this._paused) {
				this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTotalTime == 0) if (this.vars.onStart) if (this._totalTime !== 0 || this._duration === 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}
			
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}
			
			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			if (this._cycle != prevCycle) if (!suppressEvents) if (!this._gc) if (this.vars.onRepeat) {
				this.vars.onRepeat.apply(this.vars.onRepeatScope || this, this.vars.onRepeatParams || _blankArray);
			}
			if (callback) if (!this._gc) { //check gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
		};
		
//---- STATIC FUNCTIONS -----------------------------------------------------------------------------------------------------------
		
		TweenMax.to = function(target, duration, vars) {
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.from = function(target, duration, vars) {
			vars.runBackwards = true;
			if (vars.immediateRender != false) {
				vars.immediateRender = true;
			}
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return new TweenMax(target, duration, toVars);
		};
		
		TweenMax.staggerTo = TweenMax.allTo = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			stagger = stagger || 0;
			var a = [],
				l = targets.length,
				delay = vars.delay || 0,
				copy, i, p;
			for (i = 0; i < l; i++) {
				copy = {};
				for (p in vars) {
					copy[p] = vars[p];
				}
				copy.delay = delay;
				if (i === l - 1) if (onCompleteAll) {
					copy.onComplete = function() {
						if (vars.onComplete) {
							vars.onComplete.apply(vars.onCompleteScope, vars.onCompleteParams);
						}
						onCompleteAll.apply(onCompleteAllScope, onCompleteAllParams);
					}
				}
				a[i] = new TweenMax(targets[i], duration, copy);
				delay += stagger;
			}
			return a;
		};
		
		TweenMax.staggerFrom = TweenMax.allFrom = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.runBackwards = true;
			if (vars.immediateRender != false) {
				vars.immediateRender = true;
			}
			return TweenMax.staggerTo(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
		
		TweenMax.staggerFromTo = TweenMax.allFromTo = function(targets, duration, fromVars, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return TweenMax.staggerTo(targets, duration, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
				
		TweenMax.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenMax(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, onCompleteScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, onReverseCompleteScope:scope, immediateRender:false, useFrames:useFrames, overwrite:0});
		};
		
		TweenMax.set = function(target, vars) {
			return new TweenMax(target, 0, vars);
		};
		
		TweenMax.isTweening = function(target) {
			var a = TweenLite.getTweensOf(target),
				i = a.length,
				tween;
			while (--i > -1) {
				if (((tween = a[i])._active || (tween._startTime === tween.timeline._time && tween.timeline._active))) {
					return true;
				}
			}
			return false;
		};
		
		TweenMax.getAllTweens = function(includeTimelines) {
			var a = _getChildrenOf(Animation._rootTimeline, includeTimelines);
			return a.concat( _getChildrenOf(Animation._rootFramesTimeline, includeTimelines) );
		};
		
		var _getChildrenOf = function(timeline, includeTimelines) {
			var a = [],
				cnt = 0,
				tween = timeline._first;
			while (tween) {
				if (tween instanceof TweenLite) {
					a[cnt++] = tween;
				} else {
					if (includeTimelines) {
						a[cnt++] = tween;
					}
					a = a.concat(_getChildrenOf(tween, includeTimelines));
					cnt = a.length;
				}
				tween = tween._next;
			}
			return a;
		};
		
		TweenMax.killAll = function(complete, tweens, delayedCalls, timelines) {
			if (tweens == null) {
				tweens = true;
			}
			if (delayedCalls == null) {
				delayedCalls = true;
			}
			var a = getAllTweens((timelines != false)),
				i = a.length,
				allTrue = (tweens && delayedCalls && timelines),
				isDC, tween;
			while (--i > -1) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					if (complete) {
						tween.totalTime(tween.totalDuration());
					} else {
						tween._enabled(false, false);
					}
				}
			}
		};
		
		TweenMax.pauseAll = function(tweens, delayedCalls, timelines) {
			_changePause(true, tweens, delayedCalls, timelines);
		};
		
		TweenMax.resumeAll = function(tweens, delayedCalls, timelines) {
			_changePause(false, tweens, delayedCalls, timelines);
		};
		
		var _changePause = function(pause, tweens, delayedCalls, timelines) {
			if (tweens == undefined) {
				tweens = true;
			}
			if (delayedCalls == undefined) {
				delayedCalls = true;
			}
			var a = getAllTweens(timelines),
				allTrue = (tweens && delayedCalls && timelines),
				i = a.length,
				isDC, tween;
			while (--i > -1) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					tween.paused(pause);
				}
			}
		};
		
	
//---- GETTERS / SETTERS ----------------------------------------------------------------------------------------------------------
		
		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * value + (this._cycle * this._duration), false);
		};
		
		p.totalProgress = function(value) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
		};
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat != 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};
		
		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					//instead of Infinity, we use 999999999999 so that we can accommodate reverses
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (this._repeat == -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		};
		
		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};
		
		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};
		
		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};
		
		
		return TweenMax;
		
	}, true);




/*
 * ----------------------------------------------------------------
 * TimelineLite 													(!TimelineLite)
 * ----------------------------------------------------------------
 */
	_gsRequire("TimelineLite", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {
		
		"use strict";
		
		var TimelineLite = function(vars) {
				SimpleTimeline.call(this, vars);
				this._labels = {};
				this.autoRemoveChildren = (this.vars.autoRemoveChildren == true);
				this.smoothChildTiming = (this.vars.smoothChildTiming == true);
				this._sortChildren = true;
				this._onUpdate = this.vars.onUpdate;
				var i = _paramProps.length,
					j, a;
				while (--i > -1) {
					if ((a = this.vars[_paramProps[i]])) {
						j = a.length;
						while (--j > -1) {
							if (a[j] === "{self}") {
								a = this.vars[_paramProps[i]] = a.concat(); //copy the array in case the user referenced the same array in multiple timelines/tweens (each {self} should be unique)
								a[j] = this;
							}
						}
					}
				}
				if (this.vars.tweens instanceof Array) {
					this.insertMultiple(this.vars.tweens, 0, this.vars.align || "normal", this.vars.stagger || 0);
				}
			},
			_paramProps = ["onStartParams","onUpdateParams","onCompleteParams","onReverseCompleteParams","onRepeatParams"],
			_blankArray = [],
			p = TimelineLite.prototype = new SimpleTimeline();
			
		p.constructor = TimelineLite;
		p.kill()._gc = false;
		
		p.to = function(target, duration, vars, offset, baseTimeOrLabel) {
			return this.insert( new TweenLite(target, duration, vars), this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0)); 
		}
		
		p.from = function(target, duration, vars, offset, baseTimeOrLabel) {
			return this.insert( TweenLite.from(target, duration, vars), this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0));
		}
		
		p.fromTo = function(target, duration, fromVars, toVars, offset, baseTimeOrLabel) {
			return this.insert( TweenLite.fromTo(target, duration, fromVars, toVars), this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0));
		}
		
		p.staggerTo = function(targets, duration, vars, stagger, offset, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			var tl = new TimelineLite({onComplete:onCompleteAll, onCompleteParams:onCompleteAllParams, onCompleteScope:onCompleteAllScope});
			stagger = stagger || 0;
			for (var i = 0; i < targets.length; i++) {
				tl.insert( new TweenLite(targets[i], duration, vars), i * stagger);
			}
			return this.insert(tl, this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0));
		}
		
		p.staggerFrom = function(targets, duration, vars, stagger, offset, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			if (vars.immediateRender == null) {
				vars.immediateRender = true;
			}
			vars.runBackwards = true;
			return this.staggerTo(targets, duration, vars, stagger, offset, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		}
		
		p.staggerFromTo = function(targets, duration, fromVars, toVars, stagger, offset, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return this.staggerTo(targets, duration, toVars, stagger, offset, baseTimeOrLabel, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		}
		
		p.call = function(callback, params, scope, offset, baseTimeOrLabel) {
			return this.insert( TweenLite.delayedCall(0, callback, params, scope), this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0));
		}
		
		p.set = function(target, vars, offset, baseTimeOrLabel) {
			vars.immediateRender = false;
			return this.insert( new TweenLite(target, 0, vars), this._parseTimeOrLabel(baseTimeOrLabel) + (offset || 0));
		}
		
		TimelineLite.exportRoot = function(vars, ignoreDelayedCalls) {
			vars = vars || {};
			if (vars.smoothChildTiming == null) {
				vars.smoothChildTiming = true;
			}
			var tl = new TimelineLite(vars),
				root = tl._timeline;
			if (ignoreDelayedCalls == null) {
				ignoreDelayedCalls = true;
			}
			root._remove(tl, true);
			tl._startTime = 0;

			tl._rawPrevTime = tl._time = tl._totalTime = root._time;
			var tween = root._first, next;
			while (tween) {
				next = tween._next;
				if (!ignoreDelayedCalls || !(tween instanceof TweenLite && tween.target == tween.vars.onComplete)) {
					tl.insert(tween, tween._startTime - tween._delay);
				}
				tween = next;
			}
			root.insert(tl, 0);
			return tl;
		}
		
		p.insert = function(value, timeOrLabel) {
			if (value instanceof Animation) {
				//continue...
			} else if (value instanceof Array) {
				return this.insertMultiple(value, timeOrLabel);
			} else if (typeof(value) === "string") {
				return this.addLabel(value, this._parseTimeOrLabel(timeOrLabel || 0, true));
			} else if (typeof(value) === "function") {
				value = TweenLite.delayedCall(0, value);
			} else {
				throw ("ERROR: Cannot insert() " + value + " into the TimelineLite/Max because it is neither a tween, timeline, function, nor a String.");
				return this;
			}
			
			SimpleTimeline.prototype.insert.call(this, value, this._parseTimeOrLabel(timeOrLabel || 0, true));
			
			//if the timeline has already ended but the inserted tween/timeline extends the duration past the parent timeline's currentTime, we should enable this timeline again so that it renders properly.  
			if (this._gc) if (!this._paused) if (this._startTime + (value._startTime + (value._totalDuration / value._timeScale)) / this._timeScale > this.timeline._time) {
				//in case any of the anscestors had completed but should now be enabled...
				var tl = this;
				while (tl._gc && tl._timeline) {
					tl.totalTime(tl._totalTime, true); //also enables them
					tl = tl._timeline;
				}
			}
			return this;
		}
		
		p.remove = function(value) {
			if (value instanceof Animation) {
				return this._remove(value, false);
			} else if (value instanceof Array) {
				var i = value.length;
				while (--i > -1) {
					this.remove(value[i]);
				}
				return this;
			} else if (typeof(value) === "string") {
				return this.removeLabel(value);
			}
			return this.kill(null, value);
		}
		
		p.append = function(value, offset) {
			return this.insert(value, this.duration() + (offset || 0));
		}
		
		p.insertMultiple = function(tweens, timeOrLabel, align, stagger) {
			align = align || "normal";
			stagger = stagger || 0;
			var i, tween, curTime = this._parseTimeOrLabel(timeOrLabel || 0, true), l = tweens.length;
			for (i = 0; i < l; i++) {
				if ((tween = tweens[i]) instanceof Array) {
					tween = new TimelineLite({tweens:tween});
				}
				this.insert(tween, curTime);
				if (typeof(tween) === "string" || typeof(tween) === "function") {
					//do nothing
				} else if (align === "sequence") {
					curTime = tween._startTime + (tween.totalDuration() / tween._timeScale);
				} else if (align === "start") {
					tween._startTime -= tween.delay();
				}
				curTime += stagger;
			}
			return this._uncache(true);
		}
		
		p.appendMultiple = function(tweens, offset, align, stagger) {
			return this.insertMultiple(tweens, this.duration() + (offset || 0), align, stagger);
		}
		
		p.addLabel = function(label, time) {
			this._labels[label] = time;
			return this;
		}
	
		p.removeLabel = function(label) {
			delete this._labels[label];
			return this;
		}
		
		p.getLabelTime = function(label) {
			return (this._labels[label] != null) ? this._labels[label] : -1;
		}
		
		p._parseTimeOrLabel = function(timeOrLabel, appendIfAbsent) {
			if (timeOrLabel == null) {
				return this.duration();
			} else if (typeof(timeOrLabel) === "string" && isNaN(timeOrLabel)) {
				if (this._labels[timeOrLabel] == null) {
					return (appendIfAbsent) ? (this._labels[timeOrLabel] = this.duration()) : 0;
				}
				return this._labels[timeOrLabel];
			}
			return Number(timeOrLabel);
		}
		
		p.seek = function(timeOrLabel, suppressEvents) {
			return this.totalTime(this._parseTimeOrLabel(timeOrLabel, false), (suppressEvents != false));
		}
		
		p.stop = function() {
			return this.paused(true);
		}
	
		p.gotoAndPlay = function(timeOrLabel, suppressEvents) {
			return SimpleTimeline.prototype.play.call(this, timeOrLabel, suppressEvents);
		}
		
		p.gotoAndStop = function(timeOrLabel, suppressEvents) {
			return this.pause(timeOrLabel, suppressEvents);
		}
		
		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			this._active = !this._paused; 
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(), 
				prevTime = this._time, 
				prevStart = this._startTime, 
				prevTimeScale = this._timeScale, 
				prevPaused = this._paused,
				tween, isComplete, next, callback;
			if (time >= totalDur) {
				this._totalTime = this._time = totalDur;
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					if (this._duration === 0) if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) { //In order to accommodate zero-duration timelines, we must discern the momentum/direction of time in order to render values properly when the "playhead" goes past 0 in the forward direction or lands directly on it, and also when it moves past it in the backward direction (from a postitive time to a negative time).
						force = true;
					}
				}
				this._rawPrevTime = time;
				time = totalDur + 0.000001; //to avoid occassional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off)

			} else if (time <= 0) {
				this._totalTime = this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) if (this._rawPrevTime >= 0) { //zero-duration timelines are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						force = true;
					}
				} else if (!this._initted) {
					force = true;
				}
				this._rawPrevTime = time;
				time = -0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				
			} else {
				this._totalTime = this._time = this._rawPrevTime = time;
			}
			
			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._initted = true;
			}
			if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}
			
			if (this._time > prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
						
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}
						
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}
						
					}
					tween = next;
				}
			}
			
			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			
			if (callback) if (!this._gc) if (prevStart === this._startTime || prevTimeScale != this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
			
		}
		
		p._hasPausedChild = function() {
			var tween = this._first;
			while (tween) {
				if (tween._paused || ((tween instanceof TimelineLite) && tween._hasPausedChild())) {
					return true;
				}
				tween = tween._next;
			}
			return false;
		}
		
		p.getChildren = function(nested, tweens, timelines, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || -9999999999;
			var a = [], 
				tween = this._first, 
				cnt = 0;
			while (tween) {
				if (tween._startTime < ignoreBeforeTime) {
					//do nothing
				} else if (tween instanceof TweenLite) {
					if (tweens != false) {
						a[cnt++] = tween;
					}
				} else {
					if (timelines != false) {
						a[cnt++] = tween;
					}
					if (nested != false) {
						a = a.concat(tween.getChildren(true, tweens, timelines));
						cnt = a.length;
					}
				}
				tween = tween._next;
			}
			return a;
		}
		
		p.getTweensOf = function(target, nested) {
			var tweens = TweenLite.getTweensOf(target), 
				i = tweens.length, 
				a = [], 
				cnt = 0;
			while (--i > -1) {
				if (tweens[i].timeline === this || (nested && this._contains(tweens[i]))) {
					a[cnt++] = tweens[i];
				}
			}
			return a;
		}
		
		p._contains = function(tween) {
			var tl = tween.timeline;
			while (tl) {
				if (tl === this) {
					return true;
				}
				tl = tl.timeline;
			}
			return false;
		}
		
		p.shiftChildren = function(amount, adjustLabels, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || 0;
			var tween = this._first;
			while (tween) {
				if (tween._startTime >= ignoreBeforeTime) {
					tween._startTime += amount;
				}
				tween = tween._next;
			}
			if (adjustLabels) {
				for (var p in this._labels) {
					if (this._labels[p] >= ignoreBeforeTime) {
						this._labels[p] += amount;
					}
				}
			}
			return this._uncache(true);
		}
		
		p._kill = function(vars, target) {
			if (vars == null) if (target == null) {
				return this._enabled(false, false);
			}
			var tweens = (target == null) ? this.getChildren(true, true, false) : this.getTweensOf(target),
				i = tweens.length, 
				changed = false;
			while (--i > -1) {
				if (tweens[i]._kill(vars, target)) {
					changed = true;
				}
			}
			return changed;
		}
		
		p.clear = function(labels) {
			var tweens = this.getChildren(false, true, true),
				i = tweens.length;
			this._time = this._totalTime = 0;
			while (--i > -1) {
				tweens[i]._enabled(false, false);
			}
			if (labels != false) {
				this._labels = {};
			}
			return this._uncache(true);
		}
		
		p.invalidate = function() {
			var tween = this._first;
			while (tween) {
				tween.invalidate();
				tween = tween._next;
			}
			return this;
		}
		
		p._enabled = function(enabled, ignoreTimeline) {
			if (enabled == this._gc) {
				var tween = this._first;
				while (tween) {
					tween._enabled(enabled, true);
					tween = tween._next;
				}
			}
			return SimpleTimeline.prototype._enabled.call(this, enabled, ignoreTimeline);
		}
		
		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime(this.duration() * value, false);
		}
		
		p.duration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					this.totalDuration(); //just triggers recalculation
				}
				return this._duration;
			}
			if (this.duration() !== 0) if (value !== 0) {
				this.timeScale(this._duration / value);
			}
			return this;
		}
		
		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					var max = 0, 
						tween = this._first, 
						prevStart = -999999999999, 
						next, end;
					while (tween) {
						next = tween._next; //record it here in case the tween changes position in the sequence...
						
						if (tween._startTime < prevStart && this._sortChildren) { //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
							this.insert(tween, tween._startTime - tween._delay);
						} else {
							prevStart = tween._startTime;
						}
						if (tween._startTime < 0) {//children aren't allowed to have negative startTimes, so adjust here if one is found.
							max -= tween._startTime;
							this.shiftChildren(-tween._startTime, false, -9999999999);
						}
						end = tween._startTime + ((!tween._dirty ? tween._totalDuration : tween.totalDuration()) / tween._timeScale);
						if (end > max) {
							max = end;
						}
						
						tween = next;
					}
					this._duration = this._totalDuration = max;
					this._dirty = false;
				}
				return this._totalDuration;
			}
			if (this.totalDuration() !== 0) if (value !== 0) {
				this.timeScale(this._totalDuration / value);
			}
			return this;
		}
		
		p.usesFrames = function() {
			var tl = this._timeline;
			while (tl._timeline) {
				tl = tl._timeline;
			}
			return (tl === Animation._rootFramesTimeline);
		}
		
		p.rawTime = function() {
			return (this._paused || (this._totalTime !== 0 && this._totalTime !== this._totalDuration)) ? this._totalTime : (this._timeline.rawTime() - this._startTime) * this._timeScale;
		}
		
		return TimelineLite;
		
	}, true);
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * TimelineMax
 * ----------------------------------------------------------------
 */
	_gsRequire("TimelineMax", ["TimelineLite","TweenLite","easing.Ease"], function(TimelineLite, TweenLite, Ease) {
		
		var TimelineMax = function(vars) {
				TimelineLite.call(this, vars);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo == true);
				this._dirty = true;
			},
			_blankArray = [],
			_easeNone = new Ease(null, null, 1, 0),
			_getGlobalPaused = function(tween) {
				while (tween) {
					if (tween._paused) {
						return true;
					}
					tween = tween._timeline;
				}
				return false;
			},
			p = TimelineMax.prototype = new TimelineLite();
			
		p.constructor = TimelineMax;
		p.kill()._gc = false;
		TimelineMax.version = 12.0;
		
		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo == true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TimelineLite.prototype.invalidate.call(this);
		}
		
		p.addCallback = function(callback, timeOrLabel, params, scope) {
			return this.insert( TweenLite.delayedCall(0, callback, params, scope), timeOrLabel);
		}
		
		p.removeCallback = function(callback, timeOrLabel) {
			if (timeOrLabel == null) {
				this._kill(null, callback);
			} else {
				var a = this.getTweensOf(callback, false),
					i = a.length,
					time = this._parseTimeOrLabel(timeOrLabel, false);
				while (--i > -1) {
					if (a[i]._startTime === time) {
						a[i]._enabled(false, false);
					}
				}
			}
			return this;
		}
		
		p.tweenTo = function(timeOrLabel, vars) {
			vars = vars || {};
			var copy = {ease:_easeNone, overwrite:2, useFrames:this.usesFrames(), immediateRender:false}, p, t;
			for (p in vars) {
				copy[p] = vars[p];
			}
			copy.time = this._parseTimeOrLabel(timeOrLabel, false);
			t = new TweenLite(this, (Math.abs(Number(copy.time) - this._time) / this._timeScale) || 0.001, copy);
			copy.onStart = function() {
				t.target.paused(true);
				if (t.vars.time != t.target.time()) { //don't make the duration zero - if it's supposed to be zero, don't worry because it's already initting the tween and will complete immediately, effectively making the duration zero anyway. If we make duration zero, the tween won't run at all.
					t.duration( Math.abs( t.vars.time - t.target.time()) / t.target._timeScale );
				}
				if (vars.onStart) { //in case the user had an onStart in the vars - we don't want to overwrite it.
					vars.onStart.apply(vars.onStartScope || t, vars.onStartParams || _blankArray);
				}
			}
			return t;
		}
		
		p.tweenFromTo = function(fromTimeOrLabel, toTimeOrLabel, vars) {
			vars = vars || {};
			vars.startAt = {time:this._parseTimeOrLabel(fromTimeOrLabel, false)};
			var t = this.tweenTo(toTimeOrLabel, vars);
			return t.duration((Math.abs( t.vars.time - t.vars.startAt.time) / this._timeScale) || 0.001);
		}
		
		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			this._active = !this._paused;
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(), 
				prevTime = this._time, 
				prevTotalTime = this._totalTime, 
				prevStart = this._startTime, 
				prevTimeScale = this._timeScale, 
				prevRawPrevTime = this._rawPrevTime,
				prevPaused = this._paused, 
				prevCycle = this._cycle, 
				tween, isComplete, next, dur, callback;
			if (time >= totalDur) {
				if (!this._locked) {
					this._totalTime = totalDur;
					this._cycle = this._repeat;
				}
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					if (this._duration === 0) if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) { //In order to accommodate zero-duration timelines, we must discern the momentum/direction of time in order to render values properly when the "playhead" goes past 0 in the forward direction or lands directly on it, and also when it moves past it in the backward direction (from a postitive time to a negative time).
						force = true;
					}
				}
				this._rawPrevTime = time;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					time = -0.000001; //to avoid occassional floating point rounding errors - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				} else {
					this._time = this._duration;
					time = this._duration + 0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				}
				
			} else if (time <= 0) {
				if (!this._locked) {
					this._totalTime = this._cycle = 0;
				}
				this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) if (this._rawPrevTime >= 0) { //zero-duration timelines are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						force = true;
					}
				} else if (!this._initted) {
					force = true;
				}
				this._rawPrevTime = time;
				time = -0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
				
			} else {
				this._time = this._rawPrevTime = time;
				if (!this._locked) {
					this._totalTime = time;
					if (this._repeat !== 0) {
						var cycleDuration = this._duration + this._repeatDelay;
						this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
						if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
							this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
						}
						this._time = this._totalTime - (this._cycle * cycleDuration);
						if (this._yoyo) if ((this._cycle & 1) != 0) {
							this._time = this._duration - this._time;
						}
						if (this._time > this._duration) {
							this._time = this._duration;
							time = this._duration + 0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
						} else if (this._time < 0) {
							this._time = 0;
							time = -0.000001; //to avoid occassional floating point rounding errors in Flash - sometimes child tweens/timelines were not being rendered at the very beginning (their progress might be 0.000000000001 instead of 0 because when Flash performed _time - tween._startTime, floating point errors would return a value that was SLIGHTLY off)
						} else {
							time = this._time;
						}
					}
				}
			}
			
			if (this._cycle !== prevCycle) if (!this._locked) {
				/*
				make sure children at the end/beginning of the timeline are rendered properly. If, for example, 
				a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
				would get transated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
				could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So 
				we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
				ensure that zero-duration tweens at the very beginning or end of the TimelineMax work. 
				*/
				var backwards = (this._yoyo && (prevCycle & 1) !== 0),
					wrap = (backwards === (this._yoyo && (this._cycle & 1) !== 0)),
					recTotalTime = this._totalTime,
					recCycle = this._cycle,
					recRawPrevTime = this._rawPrevTime,
					recTime = this._time;
				
				this._totalTime = prevCycle * this._duration;
				if (this._cycle < prevCycle) {
					backwards = !backwards;
				} else {
					this._totalTime += this._duration;
				}
				this._time = prevTime; //temporarily revert _time so that render() renders the children in the correct order. Without this, tweens won't rewind correctly. We could arhictect things in a "cleaner" way by splitting out the rendering queue into a separate method but for performance reasons, we kept it all inside this method.
				
				this._rawPrevTime = prevRawPrevTime;
				this._cycle = prevCycle;
				this._locked = true; //prevents changes to totalTime and skips repeat/yoyo behavior when we recursively call render()
				prevTime = (backwards) ? 0 : this._duration;	
				this.render(prevTime, suppressEvents, false);
				if (!suppressEvents) if (!this._gc) {
					if (this.vars.onRepeat) {
						this.vars.onRepeat.apply(this.vars.onRepeatScope || this, vars.onRepeatParams || _blankArray);
					}
				}
				if (wrap) {
					prevTime = (backwards) ? this._duration + 0.000001 : -0.000001;
					this.render(prevTime, true, false);
				}
				this._time = recTime;
				this._totalTime = recTotalTime;
				this._cycle = recCycle;
				this._rawPrevTime = recRawPrevTime;
				this._locked = false;
			}

			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._initted = true;
			}
			
			if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}
			
			if (this._time > prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
						
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}
						
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (this._paused && !prevPaused) { //in case a tween pauses the timeline when rendering
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
						}
						
					}
					tween = next;
				}
			}
			
			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			
			if (callback) if (!this._locked) if (!this._gc) if (prevStart === this._startTime || prevTimeScale != this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
		}
		
		p.getActive = function(nested, tweens, timelines) {
			if (nested == null) {
				nested = true;
			}
			if (tweens == null) {
				tweens = true;
			}
			if (timelines == null) {
				timelines = false;
			}
			var a = [], 
				all = this.getChildren(nested, tweens, timelines), 
				cnt = 0, 
				l = all.length,
				i, tween;
			for (i = 0; i < l; i++) {
				tween = all[i];
				//note: we cannot just check tween.active because timelines that contain paused children will continue to have "active" set to true even after the playhead passes their end point (technically a timeline can only be considered complete after all of its children have completed too, but paused tweens are...well...just waiting and until they're unpaused we don't know where their end point will be).
				if (!tween._paused) if (tween._timeline._totalTime >= tween._startTime) if (tween._timeline._totalTime < tween._startTime + tween._totalDuration / tween._timeScale) if (!_getGlobalPaused(tween._timeline)) {
					a[cnt++] = tween;
				}
			}
			return a;
		}
		
		
		p.getLabelAfter = function(time) {
			if (!time) if (time !== 0) { //faster than isNan()
				time = this._time;
			}
			var labels = this._getLabelsArray(),
				l = labels.length,
				i;
			for (i = 0; i < l; i++) {
				if (labels[i].time > time) {
					return labels[i].name;
				}
			}
			return null;
		}
		
		p.getLabelBefore = function(time) {
			if (time == null) {
				time = this._time;
			}
			var labels = this._getLabelsArray(),
				i = labels.length;
			while (--i > -1) {
				if (labels[i].time < time) {
					return labels[i].name;
				}
			}
			return null;
		}
		
		p._getLabelsArray = function() {
			var a = [],
				cnt = 0,
				p;
			for (p in this._labels) {
				a[cnt++] = {time:this._labels[p], name:p};
			}
			a.sort(function(a,b) {
				return a.time - b.time;
			});
			return a;
		}
		
		
//---- GETTERS / SETTERS -------------------------------------------------------------------------------------------------------
		
		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * value + (this._cycle * this._duration), false);
		}
		
		p.totalProgress = function(value) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
		}
		
		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					TimelineLite.prototype.totalDuration.call(this); //just forces refresh
					//Instead of Infinity, we use 999999999999 so that we can accommodate reverses.
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
				}
				return this._totalDuration;
			}
			return (this._repeat == -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		}
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat != 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		}
		
		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		}
		
		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		}
		
		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		}
		
		p.currentLabel = function(value) {
			if (!arguments.length) {
				return this.getLabelBefore(this._time + 0.00000001);
			}
			return this.seek(value, true);
		}
		
		return TimelineMax;
		
	}, true);
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * CSSPlugin 						(!CSSPlugin)
 * ----------------------------------------------------------------
 */
	_gsRequire("plugins.CSSPlugin", ["plugins.TweenPlugin","TweenLite"], function(TweenPlugin, TweenLite) {
		
		"use strict";
		
		var CSSPlugin = function() {
				TweenPlugin.call(this, "css");
				this._overwriteProps.pop();
			},
			p = CSSPlugin.prototype = new TweenPlugin("css");
		
		p.constructor = CSSPlugin;
		CSSPlugin.API = 2;
		CSSPlugin.suffixMap = {top:"px", right:"px", bottom:"px", left:"px", width:"px", height:"px", fontSize:"px", padding:"px", margin:"px"};
			
		//set up some local variables and functions that we can reuse for all tweens - we do this only once and cache things to improve performance
		var _NaNExp = /[^\d\-\.]/g,
			_suffixExp = /(\d|\-|\+|=|#|\.)*/g,
			_numExp = /\d+/g,
			_opacityExp = /opacity=([^)]*)/,
			_opacityValExp = /opacity:([^;]*)/,
			_capsExp = /([A-Z])/g,
			_camelExp = /-([a-z])/gi,
			_camelFunc = function(s, g) { return g.toUpperCase() },
			_horizExp = /(Left|Right|width|Width)/,
			_ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
			_ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
			_DEG2RAD = Math.PI / 180,
			_RAD2DEG = 180 / Math.PI,
			_tempDiv = document.createElement("div"),
			
			//primarily for older versions of IE
			_supportsOpacity = (function() {
				var d = document.createElement("div"), a;
				d.innerHTML = "<a style='top:1px;opacity:.55;'>a</a>";
				if (!(a = d.getElementsByTagName("a")[0])) {
					return false;
				}
				return /^0.55/.test(a.style.opacity);
			})(),
			
			//parses a color (like #9F0, #FF9900, or rgb(255,51,153)) into an array with 3 elements for red, green, and blue. Also handles rgba() values (splits into array of 4 elements of course) 
			_parseColor = function(color) {
				if (!color || color === "") {
					return _colorLookup.black;
				} else if (_colorLookup[color]) {
					return _colorLookup[color];
				} else if (color.charAt(0) === "#") {
					if (color.length === 4) { //for shorthand like #9F0
						color = "#" + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2) + color.charAt(3) + color.charAt(3);
					}
					color = parseInt(color.substr(1), 16);
					return [color >> 16, (color >> 8) & 255, color & 255];
				} else {
					return color.match(_numExp) || _colorLookup.transparent;
				}
			},
			_getIEOpacity = function(obj) {
				return (_opacityExp.test( ((typeof(obj) === "string") ? obj : (obj.currentStyle ? obj.currentStyle.filter : obj.style.filter) || "") ) ? ( parseFloat( RegExp.$1 ) / 100 ) : 1);
			},
			_getComputedStyle = (document.defaultView) ? document.defaultView.getComputedStyle : function(o,s) {},
			
			//gets an individual style property. cs is for computedStyle (a speed optimization - we don't want to run it more than once if we don't have to). calc forces the returned value to be based on the computedStyle, ignoring anything that's in the element's "style" property (computing normalizes certain things for us)
			_getStyle = function(t, p, cs, calc) { 
				if (!_supportsOpacity && p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
					return _getIEOpacity(t);
				} else if (!calc && t.style[p]) {
					return t.style[p];
				} else if ((cs = cs || _getComputedStyle(t, null))) {
					t = cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
					return (t || cs.length) ? t : cs[p]; //Opera behaves VERY strangely - length is usually 0 and cs[p] is the only way to get accurate results EXCEPT when checking for -o-transform which only works with cs.getPropertyValue()!
				} else if (t.currentStyle) {
					return t.currentStyle[p];
				}
				return null;
			},
			
			//returns at object containing ALL of the style properties in camel-case and their associated values.
			_getStyles = function(t, cs) {  
				var s = {}, i;
				if ((cs = cs || _getComputedStyle(t, null))) {
					if ((i = cs.length)) {
						while (--i > -1) {
							s[cs[i].replace(_camelExp, _camelFunc)] = cs.getPropertyValue(cs[i]);
						}
					} else { //Opera behaves differently - cs.length is always 0, so we must do a for...in loop.
						for (i in cs) {
							s[i] = cs[i];
						}
					}
				} else if ((cs = t.currentStyle || t.style)) {
					for (i in cs) {
						s[i.replace(_camelExp, _camelFunc)] = cs[i];
					}
				}
				if (!_supportsOpacity) {
					s.opacity = _getIEOpacity(t);
				}
				var tr = _getTransform(t, cs, false);
				s.rotation = tr.rotation * _RAD2DEG;
				s.skewX = tr.skewX * _RAD2DEG;
				s.scaleX = tr.scaleX;
				s.scaleY = tr.scaleY;
				s.x = tr.x;
				s.y = tr.y;
				if (s.filters != null) {
					delete s.filters;
				}
				return s;
			},
			
			//analyzes two style objects (as returned by _getStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object containing only those isolated properties and values for tweening, and optionally populates an array of those property names too (so that we can loop through them at the end of the tween and remove them for css tweens that apply a className - we don't want the cascading to get messed up)
			_cssDif = function(s1, s2, v, d) { 
				var s = {}, val, p;
				for (p in s2) {
					if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (val !== _transformProp) if (s1[p] != (val = s2[p])) if (typeof(val) === "number" || typeof(val) === "string") {
						s[p] = val;
						if (d) {
							d.props.push(p);
						}
					}
				}
				if (v) {
					for (p in v) { //copy properties (except className)
						if (p !== "className") {
							s[p] = v[p];
						}
					}
				}
				return s;
			},
			_transformMap = {scaleX:1, scaleY:1, x:1, y:1, rotation:1, shortRotation:1, skewX:1, skewY:1, scale:1},
			
			//the css transform property, like -ms-transform, -webkit-transform, -moz-transform, or -o-transform (we populate this in the method that's called for _transformProp
			_transformPropCSS,
			
			//the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
			_transformProp = (function() { //determines the transform property to use (with the appropriate vendor prefix).
				var d = document.body || document.documentElement,
					cs = _getComputedStyle(d, ""),
					a = ["O","-o-","Moz","-moz-","ms","-ms-","Webkit","-webkit-"],
					i = 9;
				while ((i-=2) > -1 && !_getStyle(d, a[i]+"transform", cs)) { }
				if (i > 0) {
					_transformPropCSS = a[i] + "transform";
					return a[i-1] + "Transform";
				}
				return null;
			})(),
						
			//parses the transform values for an element, returning an object with x, y, scaleX, scaleY, rotation, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
			_getTransform = function(t, cs, rec) {
				var s;
				if (_transformProp) {
					s = _getStyle(t, _transformPropCSS, cs, true);
				} else if (t.currentStyle) {
					//for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
					s = t.currentStyle.filter.match(_ieGetMatrixExp);
					s = (s && s.length === 4) ? s[0].substr(4) + "," + Number(s[2].substr(4)) + "," + Number(s[1].substr(4)) + "," + s[3].substr(4) + ",0,0" : null;
				}
				var v = (s || "").replace(/[^\d\-\.e,]/g, "").split(","), 
					k = (v.length >= 6),
					a = k ? Number(v[0]) : 1,
					b = k ? Number(v[1]) : 0,
					c = k ? Number(v[2]) : 0,
					d = k ? Number(v[3]) : 1,
					min = 0.00000001,
					m = rec ? t._gsTransform || {skewY:0} : {skewY:0},
					invX = (m.scaleX < 0); //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
					
				m.x = (k ? Number(v[4]) : 0);
				m.y = (k ? Number(v[5]) : 0);
				m.rotation = Math.atan2(b, a);
				m.scaleX = Math.sqrt(a * a + b * b);
				m.scaleY = Math.sqrt(d * d + c * c);
				m.skewX = Math.atan2(c, d) + m.rotation;
				if ((a < 0 && d >= 0) || (a > 0 && d <= 0)) {
					if (invX) {
						m.scaleX *= -1;
						m.skewX += (m.rotation <= 0) ? Math.PI : -Math.PI;
						m.rotation += (m.rotation <= 0) ? Math.PI : -Math.PI;
					} else {
						m.scaleY *= -1;
						m.skewX += (m.skewX <= 0) ? Math.PI : -Math.PI;
					}
				}
				//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs().
				if (m.rotation < min) if (m.rotation > -min) {
					m.rotation = 0;
				}
				if (m.skewX < min) if (m.skewX > -min) {
					m.skewX = 0;
				}
				if (rec) {
					t._gsTransform = m; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
				}
				return m;
			},
			
			_dimensions = {width:["Left","Right"], height:["Top","Bottom"]},
			_margins = ["marginLeft","marginRight","marginTop","marginBottom"], 
			_getDimension = function(n, t, cs) {
				var v = parseFloat((n === "width") ? t.offsetWidth : t.offsetHeight),
					a = _dimensions[n],
					i = a.length, 
					cs = cs || _getComputedStyle(t, null);
				while (--i > -1) {
					v -= parseFloat( _getStyle(t, "padding" + a[i], cs, true) ) || 0;
					v -= parseFloat( _getStyle(t, "border" + a[i] + "Width", cs, true) ) || 0;
				}
				return v;
			},
			
			//pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number
			_convertToPixels = function(t, p, v, sfx, recurse) {
				if (sfx === "px") { return v; }
				if (sfx === "auto") { return 0; }
				var horiz = _horizExp.test(p),
					node = t;
				_tempDiv.style.cssText = "border-style:solid; border-width:0; position:absolute; line-height:0;";
				if (sfx === "%" || sfx === "em") {
					node = t.parentNode || document.body;
					_tempDiv.style[(horiz ? "width" : "height")] = v + sfx;
				} else {
					_tempDiv.style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
				}
				node.appendChild(_tempDiv);
				var pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
				node.removeChild(_tempDiv);
				if (pix === 0 && !recurse) { //in some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect. 
					pix = _convertToPixels(t, p, v, sfx, true);
				}
				return pix;
			},
			
			//for parsing things like transformOrigin or backgroundPosition which must recognize keywords like top/left/right/bottom/center as well as percentages and pixel values. Decorates the supplied object with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
			_parsePosition = function(v, o) {
				if (v == null || v === "" || v === "auto") {
					v = "0 0";
				}
				o = o || {};
				var x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : v.split(" ")[0],
					y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : v.split(" ")[1];
				if (y == null) {
					y = "0";
				}
				o.oxp = (x.indexOf("%") !== -1);
				o.oyp = (y.indexOf("%") !== -1);
				o.oxr = (x.charAt(1) === "=");
				o.oyr = (y.charAt(1) === "=");
				o.ox = parseFloat(x.replace(_NaNExp, ""));
				o.oy = parseFloat(y.replace(_NaNExp, ""));
				return o;
			},
			
			//takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
			_parseVal = function(v, d) {
				return (v == null) ? d : (typeof(v) === "string" && v.indexOf("=") === 1) ? Number(v.split("=").join("")) + d : Number(v);
			},
			
			//translates strings like "40deg" or "40" or 40rad" or "+=40deg" to a numeric radian angle, optionally relative to a default value (if "+=" or "-=" prefix is found)
			_parseAngle = function(v, d) { 
				var m = (v.indexOf("rad") === -1) ? _DEG2RAD : 1, 
					r = (v.indexOf("=") === 1);
				v = Number(v.replace(_NaNExp, "")) * m;
				return r ? v + d : v;
			},
			_colorLookup = {aqua:[0,255,255],
							lime:[0,255,0],
							silver:[192,192,192],
							black:[0,0,0],
							maroon:[128,0,0],
							teal:[0,128,128],
							blue:[0,0,255],
							navy:[0,0,128],
							white:[255,255,255],
							fuchsia:[255,0,255],
							olive:[128,128,0],
							yellow:[255,255,0],
							orange:[255,165,0],
							gray:[128,128,128],
							purple:[128,0,128],
							green:[0,128,0],
							red:[255,0,0],
							pink:[255,192,203],
							cyan:[0,255,255],
							transparent:[255,255,255,0]};
							
		
		//gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc. 
		p._onInitTween = function(target, value, tween) {
			if (!target.nodeType) { //css is only for dom elements
				return false;
			}
			this._target = target;
			this._tween = tween;
			this._classData = this._transform = null; //_transform is only used for scaleX/scaleY/x/y/rotation/skewX/skewY tweens and _classData is only used if className is defined - this will be an array of properties that we're tweening related to the class which should be removed from the target.style at the END of the tween when the className is populated so that cascading happens properly.
			var s = this._style = target.style, 
				cs = _getComputedStyle(target, ""),
				copy, start, v;
				
			if (typeof(value) === "string") { 
				copy = s.cssText;
				start = _getStyles(target, cs);
				s.cssText = copy + ";" + value;
				v = _cssDif(start, _getStyles(target));
				if (!_supportsOpacity && _opacityValExp.test(value)) {
					val.opacity = parseFloat( RegExp.$1 );
				}
				value = v;
				s.cssText = copy;
			} else if (value.className) {
				copy = target.className;
				start = _getStyles(target, cs);
				target.className = (value.className.charAt(1) !== "=") ? value.className : (value.className.charAt(0) === "+") ? target.className + " " + value.className.substr(2) : target.className.split(value.className.substr(2)).join("");
				value = _cssDif(start, _getStyles(target), value, (this._classData = {b:copy, e:target.className, props:[]}));
				target.className = copy;
			}
			this._parseVars(value, target, cs, value.suffixMap || CSSPlugin.suffixMap);
			return true;
		}
		
		//feed a vars object to this function and it will parse through its properties and add PropTweens as necessary. This is split out from the _onInitTween() so that we can recurse if necessary, like "margin" should affect "marginLeft", "marginRight", "marginTop", and "marginBottom".
		p._parseVars = function(vars, t, cs, map) {
			var s = this._style, 
				p, v, pt, beg, clr1, clr2, bsfx, esfx, rel, start, copy;
			
			for (p in vars) {
				
				v = vars[p];
				
				if (p === "transform" || p === _transformProp) {
					this._parseTransform(t, v, cs, map);
					continue;
				} else if (_transformMap[p] || p === "transformOrigin") {
					this._parseTransform(t, vars, cs, map);
					continue;
				} else if (p === "alpha" || p === "autoAlpha") { //alpha tweens are opacity tweens			
					p = "opacity";
				} else if (p === "margin" || p === "padding") {
					copy = v.split(" ");
					rel = copy.length;
					pt = {};
					pt[p + "Top"] = copy[0];
					pt[p + "Right"] = (rel > 1) ? copy[1] : copy[0];
					pt[p + "Bottom"] = (rel === 4) ? copy[2] : copy[0];
					pt[p + "Left"] = (rel === 4) ? copy[3] : (rel === 2) ? copy[1] : copy[0];
					this._parseVars(pt, t, cs, map);
					continue;
				} else if (p === "backgroundPosition" || p === "backgroundSize") {
					pt = _parsePosition(v); //end values 
					start = _parsePosition( (beg = _getStyle(t, p, cs)) ); //starting values
					this._firstPT = pt = {_next:this._firstPT, t:s, p:p, b:beg, f:false, n:"css_" + p, type:3,
							s:start.ox, //x start
							c:pt.oxr ? pt.ox : pt.ox - start.ox, //change in x
							ys:start.oy, //y start
							yc:pt.oyr ? pt.oy : pt.oy - start.oy, //change in y
							sfx:pt.oxp ? "%" : "px", //x suffix
							ysfx:pt.oyp ? "%" : "px", //y suffix
							r:(!pt.oxp && vars.autoRound !== false)};
					pt.e = (pt.s + pt.c) + pt.sfx + " " + (pt.ys + pt.yc) + pt.ysfx; //we can't just use v because it could contain relative values, like +=50px which is an illegal final value.
					continue;
				} else if (p === "border") {
					copy = v.split(" ");
					this._parseVars({borderWidth:copy[0], borderStyle:copy[1] || "none", borderColor:copy[2] || "#000000"}, t, cs, map);
					continue;
				} else if (p === "autoRound") {
					continue;
				}
				
				beg = _getStyle(t, p, cs); 
				beg = (beg != null) ? beg + "" : ""; //make sure beginning value is a string. Don't do beg = _getStyle(...) || "" because if _getStyle() returns 0, it will make it "" since 0 is a "falsey" value.
				
				//Some of these properties are in place in order to conform with the standard PropTweens in TweenPlugins so that overwriting and roundProps occur properly. For example, f and r may seem unnecessary here, but they enable other functionality.
				//_next:*	next linked list node		[object]
				//t: 	*	target 						[object]
				//p:	*	property (camelCase)		[string]
				//s: 	*	starting value				[number]
				//c:	*	change value				[number]
				//f:	* 	is function					[boolean]
				//n:	*	name (for overwriting)		[string]
				//sfx:		suffix						[string]
				//b:		beginning value				[string]
				//i:		intermediate value			[string]
				//e: 		ending value				[string]
				//r:	*	round						[boolean]
				//type:		0=normal, 1=color, 2=rgba, 3=positional offset (like backgroundPosition or backgroundSize), 4=unsupported opacity (ie), -1=non-tweening prop	[number]
				this._firstPT = pt = {_next:this._firstPT, 
					  t:s, 
					  p:p, 
					  b:beg,	 
					  f:false,
					  n:"css_" + p,
					  sfx:"",
					  r:false,
					  type:0};
					  
				//if it's an autoAlpha, add a new PropTween for "visibility". We must make sure the "visibility" PropTween comes BEFORE the "opacity" one in order to work around a bug in old versions of IE tht would ignore "visibility" changes if made right after an alpha change. Remember, we add PropTweens in reverse order - that's why we do this here, after creating the original PropTween.
				if (p === "opacity") if (vars.autoAlpha != null) {
					this._firstPT = pt._prev = {_next:pt, t:s, p:"visibility", f:false, n:"css_visibility", r:false, type:-1, b:(Number(beg) !== 0) ? "visible" : "hidden", i:"visible", e:(Number(v) === 0) ? "hidden" : "visible"};
					this._overwriteProps.push("css_visibility");
				}
									
				//color values must be split apart into their R, G, B (and sometimes alpha) values and tweened independently.
				if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (typeof(v) === "string" && !v.indexOf("rgb("))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
					clr1 = _parseColor(beg);
					clr2 = _parseColor(v);
					pt.e = v;
					pt.s = Number(clr1[0]);				//red starting value
					pt.c = Number(clr2[0]) - pt.s;		//red change
					pt.gs = Number(clr1[1]);			//green starting value
					pt.gc = Number(clr2[1]) - pt.gs;	//green change
					pt.bs = Number(clr1[2]);			//blue starting value
					pt.bc = Number(clr2[2]) - pt.bs;	//blue change
					if (clr1.length > 3 || clr2.length > 3) { //detect an rgba() value
						pt.as = (clr1.length < 4) ? 1 : Number(clr1[3]);
						pt.ac = ((clr2.length < 4) ? 1 : Number(clr2[3])) - pt.as;
						pt.type = (pt.c || pt.gc || pt.bc || pt.ac) ? 2 : -1; //2 = rgba() tween, -1 = no tween, just set the value at the end
					} else {
						pt.type = (pt.c || pt.gc || pt.bc) ? 1 : -1; //1 = color tween, -1 = no tween, just set the value at the end because there's no changes
					}
					
				} else {
					
					bsfx = beg.replace(_suffixExp, ""); //beginning suffix
					
					if (beg === "" || beg === "auto") {
						if (p === "width" || p === "height") {
							start = _getDimension(p, t, cs);
							bsfx = "px";
						} else {
							start = (p !== "opacity") ? 0 : 1;
						}
					} else {
						start = (beg.indexOf(" ") === -1) ? parseFloat(beg.replace(_NaNExp, "")) : NaN;
					}
					
					if (typeof(v) === "string") {
						rel = (v.charAt(1) === "=");
						esfx = v.replace(_suffixExp, "");
						v = (v.indexOf(" ") === -1) ? parseFloat(v.replace(_NaNExp, "")) : NaN;
					} else {
						rel = false;
						esfx = "";
					}
					
					if (esfx === "") {
						esfx = map[p] || bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
					}
					
					pt.e = (v || v === 0) ? (rel ? v + start : v) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

					//if the beginning/ending suffixes don't match, normalize them...
					if (bsfx !== esfx) if (esfx !== "") if (v || v === 0) if (start || start === 0) { 
						start = _convertToPixels(t, p, start, bsfx);
						if (esfx === "%") {
							start /= _convertToPixels(t, p, 100, "%") / 100;
							if (start > 100) { //extremely rare
								start = 100;
							}
							
						} else if (esfx === "em") {
							start /= _convertToPixels(t, p, 1, "em");
							
						//otherwise convert to pixels.
						} else {
							v = _convertToPixels(t, p, v, esfx);
							esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
						}
						if (rel) if (v || v === 0) {
							pt.e = (v + start) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
						}
					}
					
					if ((start || start === 0) && (v || v === 0) && (pt.c = (rel ? v : v - start))) { //faster than isNaN(). Also, we set pt.c (change) here because if it's 0, we'll just treat it like a non-tweening value. can't do (v !== start) because if it's a relative value and the CHANGE is identical to the START, the condition will fail unnecessarily.
						pt.s = start;
						pt.sfx = esfx;
						if (p === "opacity") {
							if (!_supportsOpacity) {
								pt.type = 4;
								pt.p = "filter";
								pt.b = "alpha(opacity=" + (pt.s * 100) + ")";
								pt.e = "alpha(opacity=" + ((pt.s + pt.c) * 100) + ")";
								pt.dup = (vars.autoAlpha != null); //dup = duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
								this._style.zoom = 1; //helps correct an IE issue.
							}
						} else if (vars.autoRound !== false && (esfx === "px" || p === "zIndex")) { //always round zIndex, and as long as autoRound isn't false, round pixel values (that improves performance in browsers typically)
							pt.r = true;
						}
					} else {
						pt.type = -1;
						pt.i = pt.e; //intermediate value is typically the same as the end value.
						pt.s = pt.c = 0;
					}
					
				}
				
				this._overwriteProps.push("css_" + p);
				if (pt._next) {
					pt._next._prev = pt;
				}
			}
			
		}
		
		
		//compares the beginning x, y, scaleX, scaleY, rotation, and skewX properties with the ending ones and adds PropTweens accordingly wherever necessary. We must tween them individually (rather than just tweening the matrix values) so that elgant overwriting can occur, like if one tween is controlling scaleX, scaleY, and rotation and then another one starts mid-tween that is trying to control the scaleX only - this tween should continue tweening scaleY and rotation.
		p._parseTransform = function(t, v, cs, map) {
			if (this._transform) { return; } //only need to parse the transform once, and only if the browser supports it.
			
			var m1 = this._transform = _getTransform(t, cs, true), 
				s = this._style,
				m2, skewY, p, pt, copy, orig;
			
			if (typeof(v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)

				m2 = {scaleX:_parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
					  scaleY:_parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
					  x:_parseVal(v.x, m1.x),
					  y:_parseVal(v.y, m1.y)};
					  
				if (v.shortRotation != null) {
					m2.rotation = (typeof(v.shortRotation) === "number") ? v.shortRotation * _DEG2RAD : _parseAngle(v.shortRotation, m1.rotation);
					var dif = (m2.rotation - m1.rotation) % (Math.PI * 2);
					if (dif !== dif % Math.PI) {
						dif += Math.PI * ((dif < 0) ? 2 : -2);
					}
					m2.rotation = m1.rotation + dif;
					
				} else {
					m2.rotation = (v.rotation == null) ? m1.rotation : (typeof(v.rotation) === "number") ? v.rotation * _DEG2RAD : _parseAngle(v.rotation, m1.rotation);
				}
				m2.skewX = (v.skewX == null) ? m1.skewX : (typeof(v.skewX) === "number") ? v.skewX * _DEG2RAD : _parseAngle(v.skewX, m1.skewX);
				
				//note: for performance reasons, we combine all skewing into the skewX and rotation values, ignoring skewY but we must still record it so that we can discern how much of the overall skew is attributed to skewX vs. skewY. Otherwise, if the skewY would always act relative (tween skewY to 10deg, for example, multiple times and if we always combine things into skewX, we can't remember that skewY was 10 from last time). Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of -10 degrees.
				m2.skewY = (v.skewY == null) ? m1.skewY : (typeof(v.skewY) === "number") ? v.skewY * _DEG2RAD : _parseAngle(v.skewY, m1.skewY);
				if ((skewY = m2.skewY - m1.skewY)) {
					m2.skewX += skewY;
					m2.rotation += skewY;
				}
				
				//if a transformOrigin is defined, handle it here...
				if ((orig = v.transformOrigin) != null) {
					if (_transformProp) {
						p = _transformProp + "Origin";
						this._firstPT = pt = {_next:this._firstPT, t:s, p:p, s:0, c:0, n:p, f:false, r:false, b:s[p], e:orig, i:orig, type:-1, sfx:""};
						if (pt._next) {
							pt._next._prev = pt;
						}
					
					//for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp). 
					} else {
						_parsePosition(orig, m1);
					}
				}
				
			} else if (typeof(v) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
				copy = s[_transformProp];
				s[_transformProp] = v;
				m2 = _getTransform(t, null, false);
				s[_transformProp] = copy;
			} else {
				return;
			}
			
			if (!_transformProp) {
				s.zoom = 1; //helps correct an IE issue.
			} else if (_transformProp === "WebkitTransform") {
				s[_transformProp + "Style"] = "preserve-3d"; //corrects a bug in Safari that causes it to skip rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
			}
			
			for (p in _transformMap) {
				if (m1[p] !== m2[p]) if (p !== "shortRotation") if (p !== "scale") {
					this._firstPT = pt = {_next:this._firstPT, t:m1, p:p, s:m1[p], c:m2[p] - m1[p], n:p, f:false, r:false, b:m1[p], e:m2[p], type:0, sfx:0};
					if (pt._next) {
						pt._next._prev = pt;
					}
					this._overwriteProps.push("css_" + p);
				}
			}
		};
		
		
		//gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
		p.setRatio = function(v) {
			var pt = this._firstPT, val, y;
			
			//at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards). 
			if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
				while (pt) {
					pt.t[pt.p] = pt.e;
					if (pt.type === 4) if (pt.s + pt.c === 1) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance.
						this._style.removeAttribute("filter");
					}
					pt = pt._next;
				}
			
			} else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0)) {
				
				while (pt) {
					val = pt.c * v + pt.s;
					if (pt.r) {
						val = (val > 0) ? (val + 0.5) >> 0 : (val - 0.5) >> 0; 
					}
					if (!pt.type) {
						pt.t[pt.p] = val + pt.sfx;
					} else if (pt.type === 1) { //rgb()
						pt.t[pt.p] = "rgb(" + (val >> 0) + ", " + ((pt.gs + (v * pt.gc)) >> 0) + ", " + ((pt.bs + (v * pt.bc)) >> 0) + ")";
					} else if (pt.type === 2) { //rgba()
						pt.t[pt.p] = "rgba(" + (val >> 0) + ", " + ((pt.gs + (v * pt.gc)) >> 0) + ", " + ((pt.bs + (v * pt.bc)) >> 0) + ", " + (pt.as + (v * pt.ac)) + ")";
					} else if (pt.type === -1) { //non-tweening
						pt.t[pt.p] = pt.i;
					} else if (pt.type === 3) { //positional property with an x and y, like backgroundPosition or backgroundSize
						y = pt.ys + v * pt.yc;
						if (pt.r) {
							y = (y > 0) ? (y + 0.5) >> 0 : (y - 0.5) >> 0; 
						}
						pt.t[pt.p] = val + pt.sfx + " " + y + pt.ysfx;						
					} else {
						if (pt.dup) {
							pt.t.filter = pt.t.filter || "alpha(opacity=100)"; //works around bug in IE7/8 that prevents changes to "visibility" from being applied propertly if the filter is changed to a different alpha on the same frame.
						}
						if (pt.t.filter.indexOf("opacity=") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8)
							pt.t.filter += " alpha(opacity=" + ((val * 100) >> 0) + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
						} else {
							pt.t.filter = pt.t.filter.replace(_opacityExp, "opacity=" + ((val * 100) >> 0)); //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
						}
					}
					pt = pt._next;
				}
				
			//if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
			} else {
				while (pt) {
					pt.t[pt.p] = pt.b;
					if (pt.type === 4) if (pt.s === 1) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance. 
						this._style.removeAttribute("filter");
					}
					pt = pt._next;
				}
			}
			
			//apply transform values like x, y, scaleX, scaleY, rotation, skewX, or skewY. We do these after looping through all the PropTweens because those are where the changes are made to scaleX/scaleY/rotation/skewX/skewY/x/y.
			if (this._transform) {
				pt = this._transform; //to improve speed and reduce size, reuse the pt variable as an alias to the _transform property
				//if there is no rotation, browsers render the transform faster if we just feed it the list of transforms like translate() skewX() scale(), otherwise defining the matrix() values directly is fastest.
				if (_transformProp && !pt.rotation) {
					this._style[_transformProp] = ((pt.x || pt.y) ? "translate(" + pt.x + "px," + pt.y + "px) " : "") + (pt.skewX ? "skewX(" + pt.skewX + "rad) " : "") + ((pt.scaleX !== 1 || pt.scaleY !== 1) ? "scale(" + pt.scaleX + "," + (Math.cos(pt.skewX) * pt.scaleY) + ")" : "") || "translate(0px,0px)"; //we need to default to translate(0px,0px) to work around a Chrome bug that rears its ugly head when the transform is set to "".
				} else {
					var ang = _transformProp ? pt.rotation : -pt.rotation, 
						skew = _transformProp ? ang - pt.skewX : ang + pt.skewX,
						a = Math.cos(ang) * pt.scaleX,
						b = Math.sin(ang) * pt.scaleX,
						c = Math.sin(skew) * -pt.scaleY,
						d = Math.cos(skew) * pt.scaleY,
						min = 0.00000001,
						cs;
					//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases for both b and c. The conditional logic here is faster than calling Math.abs().
					if (b < min) if (b > -min) {
						b = 0;
					}
					if (c < min) if (c > -min) {
						c = 0;
					}
					if (_transformProp) {
						this._style[_transformProp] = "matrix(" + a + "," + b + "," + c + "," + d + "," + pt.x + "," + pt.y + ")";
						
					//only for older versions of IE (6-8), we use a filter and marginLeft/marginTop to simulate the transform.
					} else if ((cs = this._target.currentStyle)) {
						min = b; //just for swapping the variables an inverting them (reused "min" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
						b = -c;
						c = -min;
						var filters = this._style.filter;
						this._style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
						var w = this._target.offsetWidth,
							h = this._target.offsetHeight,
							clip = (cs.position !== "absolute"),
							m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
							ox = pt.x,
							oy = pt.y,
							dx, dy;
						
						//if transformOrigin is being used, adjust the offset x and y
						if (pt.ox != null) {
							dx = ((pt.oxp) ? w * pt.ox * 0.01 : pt.ox) - w / 2;
							dy = ((pt.oyp) ? h * pt.oy * 0.01 : pt.oy) - h / 2;
							ox = dx - (dx * a + dy * b) + pt.x;
							oy = dy - (dx * c + dy * d) + pt.y;
						}
						
						if (!clip) {
							var i = 4, marg, prop;
							dx = pt.ieOffsetX || 0;
							dy = pt.ieOffsetY || 0;
							pt.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
							pt.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
							while (--i > -1) {
								prop = _margins[i];
								marg = cs[prop];
								//we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
								val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this._target, p, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
								if (i === 1) { //the right and bottom margins don't need to factor in the x/y changes.
									val -= ox;
								} else if (i === 3) {
									val -= oy;
								}
								this._style[prop] = Math.round( (val - ((i < 2) ? dx - pt.ieOffsetX : dy - pt.ieOffsetY)) ) + "px";
							}
							m += ",sizingMethod='auto expand')";
						} else {
							dx = (w / 2),
							dy = (h / 2);
							//translate to ensure that transformations occur around the correct origin (default is center).
							m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
						}
						
						if (filters.indexOf("progid:DXImageTransform.Microsoft.Matrix(") !== -1) {
							this._style.filter = filters.replace(_ieSetMatrixExp, m);
						} else {
							this._style.filter = filters + " " + m;
						}
	
						//at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
						if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) {
							this._style.removeAttribute("filter");
						}
					}
				}
			}
			
			//if we're adding/changing a class, we should do so at the END of the tween, and drop any of the associated properties that are in the target.style object in order to preserve proper cascading.
			if (this._classData) {
				pt = this._classData; //speeds things up slightly and helps minification
				if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
					var i = pt.props.length;
					while (--i > -1) {
						this._style[pt.props[i]] = "";
					}
					this._target.className = pt.e;
				} else if (this._target.className !== pt.b) {
					this._target.className = pt.b;
				}
			}
		}
		
		//we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
		p._kill = function(lookup) {
			var copy = lookup, p;
			if (lookup.autoAlpha || lookup.alpha) {
				copy = {};
				for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
					copy[p] = lookup[p];
				}
				copy.opacity = 1;
				if (copy.autoAlpha) {
					copy.visibility = 1;
				}
			}
			return TweenPlugin.prototype._kill.call(this, copy);
		}
		
		
		TweenPlugin.activate([CSSPlugin]);
		return CSSPlugin;
		
	}, true);
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * RoundPropsPlugin
 * ----------------------------------------------------------------
 */
	_gsRequire("plugins.RoundPropsPlugin", ["plugins.TweenPlugin"], function(TweenPlugin) {
		
		var RoundPropsPlugin = function(props, priority) {
				TweenPlugin.call(this, "roundProps", -1);
			},
			p = RoundPropsPlugin.prototype = new TweenPlugin("roundProps", -1);
		
		p.constructor = RoundPropsPlugin;
		RoundPropsPlugin.API = 2;
		
		p._onInitTween = function(target, value, tween) {
			this._tween = tween;
			return true;
		}
		
		p._onInitAllProps = function() {
			var rp = (this._tween.vars.roundProps instanceof Array) ? this._tween.vars.roundProps : this._tween.vars.roundProps.split(","), 
				i = rp.length,
				lookup = {},
				prop, pt, next;
			while (--i > -1) {
				lookup[rp[i]] = 1;
			}
			i = rp.length;
			while (--i > -1) {
				prop = rp[i];
				pt = this._tween._firstPT;
				while (pt) {
					next = pt._next; //record here, because it may get removed
					if (pt.pg) {
						pt.t._roundProps(lookup, true);
					} else if (pt.n == prop) {
						this._add(pt.t, prop, pt.s, pt.c);
						//remove from linked list
						if (pt._next) {
							pt._next._prev = pt._prev;
						}
						if (pt._prev) {
							pt._prev._next = pt._next;
						} else if (_tween._firstPT === pt) {
							this._tween._firstPT = pt._next;
						}
						pt._next = pt._prev = null;
						this._tween._propLookup[prop] = this;
					}
					pt = pt._next;
				}
			}
			return false;
		}
				
		p._add = function(target, p, s, c) {
			this._addTween(target, p, s, s + c, p, true);
			this._overwriteProps.push(p);
		}
		
		TweenPlugin.activate([RoundPropsPlugin]);
		
		return RoundPropsPlugin;
		
	}, true);
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * EasePack
 * ----------------------------------------------------------------
 */
	_gsRequire("easing.Back", ["easing.Ease"], function(Ease) {
		
		var gs = window.com.greensock, 
			_class = gs._class, 
			_create = function(n, f) {
				var c = _class("easing." + n, function(){}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				return c;
			},
			
			//BACK
			_createBack = function(n, f) {
				var c = _class("easing." + n, function(overshoot) {
						this._p1 = (overshoot || overshoot === 0) ? overshoot : 1.70158;
						this._p2 = this._p1 * 1.525;
					}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				p.config = function(overshoot) {
					return new c(overshoot);
				};
				return c;
			}, 
			BackOut = _createBack("BackOut", function(p) {
				return ((p = p - 1) * p * ((this._p1 + 1) * p + this._p1) + 1);
			}), 
			BackIn = _createBack("BackIn", function(p) {
				return p * p * ((this._p1 + 1) * p - this._p1);
			}), 
			BackInOut = _createBack("BackInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * p * p * ((this._p2 + 1) * p - this._p2) : 0.5 * ((p -= 2) * p * ((this._p2 + 1) * p + this._p2) + 2);
			}),  
			
			//BOUNCE
			BounceOut = _create("BounceOut", function(p) {
				if (p < 1 / 2.75) {
					return 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					return 7.5625 * (p -= 1.5 / 2.75) * p + .75;
				} else if (p < 2.5 / 2.75) {
					return 7.5625 * (p -= 2.25 / 2.75) * p + .9375;
				} else {
					return 7.5625 * (p -= 2.625 / 2.75) * p + .984375;
				}
			}), 
			BounceIn = _create("BounceIn", function(p) {
				if ((p = 1 - p) < 1 / 2.75) {
					return 1 - (7.5625 * p * p);
				} else if (p < 2 / 2.75) {
					return 1 - (7.5625 * (p -= 1.5 / 2.75) * p + .75);
				} else if (p < 2.5 / 2.75) {
					return 1 - (7.5625 * (p -= 2.25 / 2.75) * p + .9375);
				} else {
					return 1 - (7.5625 * (p -= 2.625 / 2.75) * p + .984375);
				}
			}), 
			BounceInOut = _create("BounceInOut", function(p) {
				var invert = (p < 0.5);
				if (invert) {
					p = 1 - (p * 2);
				} else {
					p = (p * 2) - 1;
				}
				if (p < 1 / 2.75) {
					p = 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					p = 7.5625 * (p -= 1.5 / 2.75) * p + .75;
				} else if (p < 2.5 / 2.75) {
					p = 7.5625 * (p -= 2.25 / 2.75) * p + .9375;
				} else {
					p = 7.5625 * (p -= 2.625 / 2.75) * p + .984375;
				}
				return invert ? (1 - p) * 0.5 : p * 0.5 + 0.5;
			}),
			
			//CIRC
			CircOut = _create("CircOut", function(p) {
				return Math.sqrt(1 - (p = p - 1) * p);
			}),
			CircIn = _create("CircIn", function(p) {
				return -(Math.sqrt(1 - (p * p)) - 1);
			}),
			CircInOut = _create("CircInOut", function(p) {
				return ((p*=2) < 1) ? -0.5 * (Math.sqrt(1 - p * p) - 1) : 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1);
			}),
			
			//ELASTIC
			_2PI = Math.PI * 2,
			_createElastic = function(n, f, def) {
				var c = _class("easing." + n, function(amplitude, period) {
						amplitude = amplitude || 0;
						this._p1 = (!amplitude || amplitude < 1) ? 1 : amplitude;
						this._p2 = period || def;
						this._p3 = this._p2 / _2PI * Math.asin(1 / this._p1);
					}, true), 
					p = c.prototype = new Ease();
				p.constructor = c;
				p.getRatio = f;
				p.config = function(amplitude, period) {
					return new c(amplitude, period);
				};
				return c;
			}, 
			ElasticOut = _createElastic("ElasticOut", function(p) {
				return this._p1 * Math.pow(2, -10 * p) * Math.sin( (p - this._p3) * _2PI / this._p2 ) + 1;
			}, 0.3), 
			ElasticIn = _createElastic("ElasticIn", function(p) {
				return -(this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2 ));
			}, 0.3), 
			ElasticInOut = _createElastic("ElasticInOut", function(p) {
				return ((p *= 2) < 1) ? -.5 * (this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2)) : this._p1 * Math.pow(2, -10 *(p -= 1)) * Math.sin( (p - this._p3) * _2PI / this._p2 ) *.5 + 1;
			}, 0.45),
			
			//Expo
			ExpoOut = _create("ExpoOut", function(p) {
				return 1 - Math.pow(2, -10 * p);
			}),
			ExpoIn = _create("ExpoIn", function(p) {
				return Math.pow(2, 10 * (p - 1)) - 0.001;
			}),
			ExpoInOut = _create("ExpoInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
			}), 
			
			//Sine
			_HALF_PI = Math.PI / 2,
			SineOut = _create("SineOut", function(p) {
				return Math.sin(p * _HALF_PI);
			}),
			SineIn = _create("SineIn", function(p) {
				return -Math.cos(p * _HALF_PI) + 1;
			}),
			SineInOut = _create("SineInOut", function(p) {
				return -0.5 * (Math.cos(Math.PI * p) - 1);
			}),
			
			//SlowMo
			SlowMo = _class("easing.SlowMo", function(linearRatio, power, yoyoMode) {
				power = (power || power === 0) ? power : 0.7;
				if (linearRatio == null) {
					linearRatio = 0.7;
				} else if (linearRatio > 1) {
					linearRatio = 1;
				}
				this._p = (linearRatio != 1) ? power : 0;
				this._p1 = (1 - linearRatio) / 2;
				this._p2 = linearRatio;
				this._p3 = this._p1 + this._p2;
				this._calcEnd = (yoyoMode == true);
			}, true),
			p = SlowMo.prototype = new Ease();
			
		p.constructor = SlowMo;
		p.getRatio = function(p) {
			var r = p + (0.5 - p) * this._p;
			if (p < this._p1) {
				return this._calcEnd ? 1 - ((p = 1 - (p / this._p1)) * p) : r - ((p = 1 - (p / this._p1)) * p * p * p * r);
			} else if (p > this._p3) {
				return this._calcEnd ? 1 - (p = (p - this._p3) / this._p1) * p : r + ((p - r) * (p = (p - this._p3) / this._p1) * p * p * p);
			}
			return this._calcEnd ? 1 : r;
		};
		SlowMo.ease = new SlowMo(0.7, 0.7);
		
		p.config = function(linearRatio, power, yoyoMode) {
			return new SlowMo(linearRatio, power, yoyoMode);
		};
		
		
		_class("easing.Bounce", {
				easeOut:new BounceOut(),
				easeIn:new BounceIn(),
				easeInOut:new BounceInOut()
			}, true);
		
		_class("easing.Circ", {
				easeOut:new CircOut(),
				easeIn:new CircIn(),
				easeInOut:new CircInOut()
			}, true);
		
		_class("easing.Elastic", {
				easeOut:new ElasticOut(),
				easeIn:new ElasticIn(),
				easeInOut:new ElasticInOut()
			}, true);
			
		_class("easing.Expo", {
				easeOut:new ExpoOut(),
				easeIn:new ExpoIn(),
				easeInOut:new ExpoInOut()
			}, true);
			
		_class("easing.Sine", {
				easeOut:new SineOut(),
				easeIn:new SineIn(),
				easeInOut:new SineInOut()
			}, true);
		
		
		return {
			easeOut:new BackOut(),
			easeIn:new BackIn(),
			easeInOut:new BackInOut()
		};
		
	}, true);


}); 



/*
 * ----------------------------------------------------------------
 * Base classes like TweenLite, SimpleTimeline, Ease, Ticker, etc. (!TweenLite)
 * ----------------------------------------------------------------
 */
(function(window) {
	
		"use strict";
		var _namespace = function(ns) {
				var a = ns.split("."), 
					p = window, i;
				for (i = 0; i < a.length; i++) {
					p[a[i]] = p = p[a[i]] || {};
				}
				return p;
			},
			gs = _namespace("com.greensock"),
			a, i, e, e2, p,
			_classLookup = {},
			
			//_DepClass is for defining a dependent class. ns = namespace (leaving off "com.greensock." as that's assumed), dep = an array of namespaces that are required, def = the function that will return the class definition (this function will be passed each dependency in order as soon as they arrive), global = if true, the class is added to the global scope (window) or if requirejs is being used, it will tap into that instead.
			_DepClass = function(ns, dep, def, global) {
				this.sc = (_classLookup[ns]) ? _classLookup[ns].sc : []; //subclasses
				_classLookup[ns] = this;
				this.gsClass = null;
				this.def = def;
				var _dep = dep || [],
					_classes = [];
				this.check = function(init) {
					var i = _dep.length, cnt = 0, cur;
					while (--i > -1) {
						if ((cur = _classLookup[_dep[i]] || new _DepClass(_dep[i])).gsClass) {
							_classes[i] = cur.gsClass;
						} else {
							cnt++;
							if (init) {
								cur.sc.push(this);
							}
						}
					}
					if (cnt === 0 && def) {
						var a = ("com.greensock." + ns).split("."),
							n = a.pop(),
							cl = _namespace(a.join("."))[n] = this.gsClass = def.apply(def, _classes);
						
						//exports to multiple environments
						if (global) {
							if (typeof(define) === "function" && define.amd){ //AMD
								define(n, [], function() { return cl; });
							} else if (typeof(module) !== "undefined" && module.exports){ //node
								module.exports = cl;
							} else {
								window[n] = cl;
							}
						}
						
						for (i = 0; i < this.sc.length; i++) {
							this.sc[i].check(false);
						}
						
					}
				};
				this.check(true);
			},
			//a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
			_class = gs._class = function(ns, f, g) {
				new _DepClass(ns, [], function(){ return f; }, g);
				return f;
			};
		
		//Used to create _DepClass instances (which basically registers a class that has dependencies). ns = namespace, dep = dependencies (array), f = initialization function which should return the class, g = global (whether or not the class should be added to the global namespace (or if RequireJS is used, it will be defined as a named module instead)
		window._gsRequire = function(ns, dep, f, g) {
			return new _DepClass(ns, dep, f, g);
		};
		
	

/*
 * ----------------------------------------------------------------
 * Ease
 * ----------------------------------------------------------------
 */
		var _baseParams = [0, 0, 1, 1],
			_blankArray = [],
			Ease = _class("easing.Ease", function(func, extraParams, type, power) {
				this._func = func;
				this._type = type || 0;
				this._power = power || 0;
				this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
			}, true);
		
		p = Ease.prototype;
		p._calcEnd = false;
		p.getRatio = function(p) {
			if (this._func) {
				this._params[0] = p;
				return this._func.apply(null, this._params);
			} else {
				var t = this._type, 
					pw = this._power, 
					r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
				if (pw === 1) {
					r *= r;
				} else if (pw === 2) {
					r *= r * r;
				} else if (pw === 3) {
					r *= r * r * r;
				} else if (pw === 4) {
					r *= r * r * r * r;
				}
				return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
			}
		};
		
		//create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
		a = ["Linear","Quad","Cubic","Quart","Quint"];
		i = a.length;
		while(--i > -1) {
			e = _class("easing." + a[i], function(){}, true);
			e2 = _class("easing.Power" + i, function(){}, true);
			e.easeOut = e2.easeOut = new Ease(null, null, 1, i);
			e.easeIn = e2.easeIn = new Ease(null, null, 2, i);
			e.easeInOut = e2.easeInOut = new Ease(null, null, 3, i);
		}
		_class("easing.Strong", gs.easing.Power4, true);
		gs.easing.Linear.easeNone = gs.easing.Linear.easeIn;
	

/*
 * ----------------------------------------------------------------
 * EventDispatcher
 * ----------------------------------------------------------------
 */
		p = _class("events.EventDispatcher", function(target) {
			this._listeners = {};
			this._eventTarget = target || this;
		}).prototype;
		
		p.addEventListener = function(type, callback, scope, useParam, priority) {
			priority = priority || 0;
			var list = this._listeners[type],
				index = 0,
				listener, i;
			if (list == null) {
				this._listeners[type] = list = [];
			}
			i = list.length;
			while (--i > -1) {
				listener = list[i];
				if (listener.c === callback) {
					list.splice(i, 1);
				} else if (index === 0 && listener.pr < priority) {
					index = i + 1;
				}
			}
			list.splice(index, 0, {c:callback, s:scope, up:useParam, pr:priority});
		};
		
		p.removeEventListener = function(type, callback) {
			var list = this._listeners[type];
			if (list) {
				var i = list.length;
				while (--i > -1) {
					if (list[i].c === callback) {
						list.splice(i, 1);
						return;
					}
				}
			}
		};
		
		p.dispatchEvent = function(type) {
			var list = this._listeners[type];
			if (list) {
				var i = list.length, listener,
					t = this._eventTarget;
				while (--i > -1) {
					listener = list[i];
					if (listener.up) {
						listener.c.call(listener.s || t, {type:type, target:t});
					} else {
						listener.c.call(listener.s || t);
					}
				}
			}
		};


/*
 * ----------------------------------------------------------------
 * Ticker
 * ----------------------------------------------------------------
 */
 		var _reqAnimFrame = window.requestAnimationFrame, 
			_cancelAnimFrame = window.cancelAnimationFrame, 
			_getTime = Date.now || function() {return new Date().getTime();};
		
		//now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
		a = ["ms","moz","webkit","o"];
		i = a.length;
		while (--i > -1 && !_reqAnimFrame) {
			_reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
			_cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
		}
		if (!_cancelAnimFrame) {
			_cancelAnimFrame = function(id) {
				window.clearTimeout(id);
			}
		}
		
		_class("Ticker", function(fps, useRAF) {
			this.time = 0;
			this.frame = 0;
			var _self = this,
				_startTime = _getTime(),
				_useRAF = (useRAF !== false),
				_fps, _req, _id, _gap, _nextTime;
			
			this.tick = function() {
				_self.time = (_getTime() - _startTime) / 1000;
				if (!_fps || _self.time >= _nextTime) {
					_self.frame++;
					_nextTime = _self.time + _gap - (_self.time - _nextTime) - 0.0005;
					if (_nextTime <= _self.time) {
						_nextTime = _self.time + 0.001;
					}
					_self.dispatchEvent("tick");
				}
				_id = _req( _self.tick );
			};
			
			this.fps = function(value) {
				if (!arguments.length) {
					return _fps;
				}
				_fps = value;
				_gap = 1 / (_fps || 60);
				_nextTime = this.time + _gap;
				_req = (_fps === 0) ? function(f){} : (!_useRAF || !_reqAnimFrame) ? function(f) { return window.setTimeout( f, (((_nextTime - _self.time) * 1000 + 1) >> 0) || 1);	} : _reqAnimFrame;
				_cancelAnimFrame(_id);
				_id = _req( _self.tick );
			};
			
			this.useRAF = function(value) {
				if (!arguments.length) {
					return _useRAF
				}
				_useRAF = value;
				this.fps(_fps);
			};
			
			this.fps(fps);
		});
		
		p = gs.Ticker.prototype = new gs.events.EventDispatcher();
		p.constructor = gs.Ticker;


/*
 * ----------------------------------------------------------------
 * Animation
 * ----------------------------------------------------------------
 */
		var Animation = _class("core.Animation", function(duration, vars) {
				this.vars = vars || {};
				this._duration = this._totalDuration = duration || 0;
				this._delay = Number(this.vars.delay) || 0;
				this._timeScale = 1;
				this._active = (this.vars.immediateRender == true);
				this.data = this.vars.data;
				this._reversed = (this.vars.reversed == true);
				
				if (!_rootTimeline) {
					return;
				}
				
				var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
				tl.insert(this, tl._time);
				
				if (this.vars.paused) {
					this.paused(true);
				}
			}),
			_ticker = Animation.ticker = new gs.Ticker();
		
		p = Animation.prototype;
		p._dirty = p._gc = p._initted = p._paused = false;
		p._totalTime = p._time = 0;
		p._rawPrevTime = -1;
		p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
		p._paused = false;
		
		p.play = function(from, suppressEvents) {
			if (arguments.length) {
				this.seek(from, suppressEvents);
			}
			this.reversed(false);
			return this.paused(false);
		};
		
		p.pause = function(atTime, suppressEvents) {
			if (arguments.length) {
				this.seek(atTime, suppressEvents);
			}
			return this.paused(true);
		};
		
		p.resume = function(from, suppressEvents) {
			if (arguments.length) {
				this.seek(from, suppressEvents);
			}
			return this.paused(false);
		};
		
		p.seek = function(time, suppressEvents) {
			return this.totalTime(Number(time), (suppressEvents != false));
		};
		
		p.restart = function(includeDelay, suppressEvents) {
			this.reversed(false);
			this.paused(false);
			return this.totalTime((includeDelay) ? -this._delay : 0, (suppressEvents != false));
		};
		
		p.reverse = function(from, suppressEvents) {
			if (arguments.length) {
				this.seek((from || this.totalDuration()), suppressEvents);
			}
			this.reversed(true);
			return this.paused(false);
		};
		
		p.render = function() {
			
		};
		
		p.invalidate = function() {
			return this;
		};
		
		p._enabled = function (enabled, ignoreTimeline) {
			this._gc = !enabled; 
			this._active = (enabled && !this._paused && this._totalTime > 0 && this._totalTime < this._totalDuration);
			if (ignoreTimeline != true) {
				if (enabled && this.timeline == null) {
					this._timeline.insert(this, this._startTime - this._delay);
				} else if (!enabled && this.timeline != null) {
					this._timeline._remove(this, true);
				}
			}
			return false;
		};
	
		
		p._kill = function(vars, target) {
			return this._enabled(false, false);
		};
		
		p.kill = function(vars, target) {
			this._kill(vars, target);
			return this;
		};
		
		p._uncache = function(includeSelf) {
			var tween = includeSelf ? this : this.timeline;
			while (tween) {
				tween._dirty = true;
				tween = tween.timeline;
			}
			return this;
		};
	
//----Animation getters/setters --------------------------------------------------------
		
		p.eventCallback = function(type, callback, params, scope) {
			if (type == null) {
				return null;
			} else if (type.substr(0,2) === "on") {
				if (arguments.length === 1) {
					return this.vars[type];
				}
				if (callback == null) {
					delete this.vars[type];
				} else {
					this.vars[type] = callback;
					this.vars[type + "Params"] = params;
					this.vars[type + "Scope"] = scope;
					if (params) {
						var i = params.length;
						while (--i > -1) {
							if (params[i] === "{self}") {
								params = this.vars[type + "Params"] = params.concat(); //copying the array avoids situations where the same array is passed to multiple tweens/timelines and {self} doesn't correctly point to each individual instance.
								params[i] = this;
							}
						}
					}
				}
				if (type === "onUpdate") {
					this._onUpdate = callback;

				}
			}
			return this;
		}
		
		p.delay = function(value) {
			if (!arguments.length) {
				return this._delay;
			}
			if (this._timeline.smoothChildTiming) {
				this.startTime( this._startTime + value - this._delay );
			}
			this._delay = value;
			return this;
		};
		
		p.duration = function(value) {
			if (!arguments.length) {
				this._dirty = false;
				return this._duration;
			}
			this._duration = this._totalDuration = value;
			this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration. 
			if (this._timeline.smoothChildTiming) if (this._active) if (value != 0) {
				this.totalTime(this._totalTime * (value / this._duration), true);
			}
			return this;
		};
		
		p.totalDuration = function(value) {
			this._dirty = false;
			return (!arguments.length) ? this._totalDuration : this.duration(value);
		};
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			return this.totalTime(value, suppressEvents);
		};
		
		p.totalTime = function(time, suppressEvents) {
			if (!arguments.length) {
				return this._totalTime;
			}
			if (this._timeline) {
				if (time < 0) {
					time += this.totalDuration();
				}
				if (this._timeline.smoothChildTiming) {
					if (this._dirty) {
						this.totalDuration();
					}
					if (time > this._totalDuration) {
						time = this._totalDuration;
					}
					this._startTime = (this._paused ? this._pauseTime : this._timeline._time) - ((!this._reversed ? time : this._totalDuration - time) / this._timeScale);
					if (!this._timeline._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the anscestors as dirty too, so skip the function call here.
						this._uncache(false);
					}
					if (!this._timeline._active) {
						//in case any of the anscestors had completed but should now be enabled...
						var tl = this._timeline;
						while (tl._timeline) {
							tl.totalTime(tl._totalTime, true);
							tl = tl._timeline;
						}
					}
				}
				if (this._gc) {
					this._enabled(true, false);
				}
				if (this._totalTime != time) {
					this.render(time, suppressEvents, false);
				}
			}
			return this;
		};
		
		p.startTime = function(value) {
			if (!arguments.length) {
				return this._startTime;
			}
			if (value != this._startTime) {
				this._startTime = value;
				if (this.timeline) if (this.timeline._sortChildren) {
					this.timeline.insert(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			return this;
		};
		
		p.timeScale = function(value) {
			if (!arguments.length) {
				return this._timeScale;
			}
			value = value || 0.000001; //can't allow zero because it'll throw the math off
			if (this._timeline && this._timeline.smoothChildTiming) {
				var t = (this._pauseTime || this._pauseTime == 0) ? this._pauseTime : this._timeline._totalTime;
				this._startTime = t - ((t - this._startTime) * this._timeScale / value);
			}
			this._timeScale = value;
			return this._uncache(false);
		};
		
		p.reversed = function(value) {
			if (!arguments.length) {
				return this._reversed;
			}
			if (value != this._reversed) {
				this._reversed = value;
				this.totalTime(this._totalTime, true);
			}
			return this;
		};
		
		p.paused = function(value) {
			if (!arguments.length) {
				return this._paused;
			}
			if (value != this._paused) if (this._timeline) {
				if (!value && this._timeline.smoothChildTiming) {
					this._startTime += this._timeline.rawTime() - this._pauseTime;
					this._uncache(false);
				}
				this._pauseTime = (value) ? this._timeline.rawTime() : null;
				this._paused = value;
				this._active = (!this._paused && this._totalTime > 0 && this._totalTime < this._totalDuration);
			}
			if (this._gc) if (!value) {
				this._enabled(true, false);
			}
			return this;
		};
	

/*
 * ----------------------------------------------------------------
 * SimpleTimeline
 * ----------------------------------------------------------------
 */
		var SimpleTimeline = _class("core.SimpleTimeline", function(vars) {
			Animation.call(this, 0, vars);
			this.autoRemoveChildren = this.smoothChildTiming = true;
		});
		
		p = SimpleTimeline.prototype = new Animation();
		p.constructor = SimpleTimeline;
		p.kill()._gc = false;
		p._first = p._last = null;
		p._sortChildren = false;
		
		p.insert = function(tween, time) {
			tween._startTime = Number(time || 0) + tween._delay;
			if (tween._paused) if (this !== tween._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order). 
				tween._pauseTime = tween._startTime + ((this.rawTime() - tween._startTime) / tween._timeScale);
			}
			if (tween.timeline) {
				tween.timeline._remove(tween, true); //removes from existing timeline so that it can be properly added to this one.
			}
			tween.timeline = tween._timeline = this;
			if (tween._gc) {
				tween._enabled(true, true);
			}
			
			var prevTween = this._last;
			if (this._sortChildren) {
				var st = tween._startTime;
				while (prevTween && prevTween._startTime > st) {
					prevTween = prevTween._prev;
				}
			}
			if (prevTween) {
				tween._next = prevTween._next;
				prevTween._next = tween;
			} else {
				tween._next = this._first;
				this._first = tween;
			}
			if (tween._next) {
				tween._next._prev = tween;
			} else {
				this._last = tween;
			}
			tween._prev = prevTween;
			
			if (this._timeline) {
				this._uncache(true);
			}
			return this;
		};
		
		p._remove = function(tween, skipDisable) {
			if (tween.timeline === this) {
				if (!skipDisable) {
					tween._enabled(false, true);
				}
				tween.timeline = null;
				
				if (tween._prev) {
					tween._prev._next = tween._next;
				} else if (this._first === tween) {
					this._first = tween._next;
				}
				if (tween._next) {
					tween._next._prev = tween._prev;
				} else if (this._last === tween) {
					this._last = tween._prev;
				}
				
				if (this._timeline) {
					this._uncache(true);
				}
			}
			return this;
		};
		
		p.render = function(time, suppressEvents, force) {
			var tween = this._first, 
				next;
			this._totalTime = this._time = this._rawPrevTime = time;
			while (tween) {
				next = tween._next; //record it here because the value could change after rendering...
				if (tween._active || (time >= tween._startTime && !tween._paused)) {
					if (!tween._reversed) {
						tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, false);
					} else {
						tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, false);
					}
				}
				tween = next;
			}
		};
				
		p.rawTime = function() {
			return this._totalTime;			
		};
	
	
/*
 * ----------------------------------------------------------------
 * TweenLite
 * ----------------------------------------------------------------
 */
		var TweenLite = _class("TweenLite", function(target, duration, vars) {
				Animation.call(this, duration, vars);
				
				if (target == null) {
					throw "Cannot tween an undefined reference.";
				}
				this.target = target;		
				
				this._overwrite = (this.vars.overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof(this.vars.overwrite) === "number") ? this.vars.overwrite >> 0 : _overwriteLookup[this.vars.overwrite];
				
				var jq, i, targ;
				if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") { 
					this._targets = target.slice(0); //works for both jQuery and Array instances
					this._propLookup = [];
					this._siblings = [];
					for (i = 0; i < this._targets.length; i++) {
						targ = this._targets[i];
						//in case the user is passing in an array of jQuery objects, for example, we need to check one more level and pull things out if necessary...
						if (targ.jquery) { 
							this._targets.splice(i--, 1);
							this._targets = this._targets.concat(targ.constructor.makeArray(targ));
							continue;
						}
						this._siblings[i] = _register(targ, this, false);
						if (this._overwrite === 1) if (this._siblings[i].length > 1) {
							_applyOverwrite(targ, this, null, 1, this._siblings[i]);
						}
					}
					
				} else {
					this._propLookup = {};
					this._siblings = _register(target, this, false);
					if (this._overwrite === 1) if (this._siblings.length > 1) {
						_applyOverwrite(target, this, null, 1, this._siblings);
					}
				}
				
				if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender != false)) {
					this.render(0, false, true);
				}
			}, true);
	
		p = TweenLite.prototype = new Animation();
		p.constructor = TweenLite;
		p.kill()._gc = false;
	
//----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------
	
		p.ratio = 0;
		p._firstPT = p._targets = p._overwrittenProps = null;
		p._notifyPluginsOfEnabled = false;
		
		TweenLite.version = 12;
		TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
		TweenLite.defaultOverwrite = "auto";
		TweenLite.ticker = _ticker;
		
		var _plugins = TweenLite._plugins = {},
			_tweenLookup = {}, 
			_tweenLookupNum = 0,
			_reservedProps = {ease:1, delay:1, overwrite:1, onComplete:1, onCompleteParams:1, onCompleteScope:1, useFrames:1, runBackwards:1, startAt:1, onUpdate:1, onUpdateParams:1, onUpdateScope:1, onStart:1, onStartParams:1, onStartScope:1, onReverseComplete:1, onReverseCompleteParams:1, onReverseCompleteScope:1, onRepeat:1, onRepeatParams:1, onRepeatScope:1, easeParams:1, yoyo:1, orientToBezier:1, immediateRender:1, repeat:1, repeatDelay:1, data:1, paused:1, reversed:1},
			_overwriteLookup = {none:0, all:1, auto:2, concurrent:3, allOnStart:4, preexisting:5, "true":1, "false":0},
			_rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(), 
			_rootTimeline = Animation._rootTimeline = new SimpleTimeline();
			
		_rootTimeline._startTime = _ticker.time;
		_rootFramesTimeline._startTime = _ticker.frame;
		_rootTimeline._active = _rootFramesTimeline._active = true;
		
		Animation._updateRoot = function() {
				_rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
				_rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
				if (!(_ticker.frame % 120)) { //dump garbage every 120 frames...
					var i, a, p;
					for (p in _tweenLookup) {
						a = _tweenLookup[p].tweens;
						i = a.length;
						while (--i > -1) {
							if (a[i]._gc) {
								a.splice(i, 1);
							}
						}
						if (a.length === 0) {
							delete _tweenLookup[p];
						}
					}
				}
			};
		
		_ticker.addEventListener("tick", Animation._updateRoot);
		
		var _register = function(target, tween, scrub) {
				var id = target._gsTweenID, a, i;
				if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
					_tweenLookup[id] = {target:target, tweens:[]};
				}
				if (tween) {
					a = _tweenLookup[id].tweens;
					a[(i = a.length)] = tween;
					if (scrub) {
						while (--i > -1) {
							if (a[i] === tween) {
								a.splice(i, 1);
							}
						}
					}
				}
				return _tweenLookup[id].tweens;
			},
			
			_applyOverwrite = function(target, tween, props, mode, siblings) {
				var i, changed, curTween;
				if (mode === 1 || mode >= 4) {
					var l = siblings.length;
					for (i = 0; i < l; i++) {
						if ((curTween = siblings[i]) !== tween) {
							if (!curTween._gc) if (curTween._enabled(false, false)) {
								changed = true;
							}
						} else if (mode === 5) {
							break;
						}
					}
					return changed;
				}
				//NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
				var startTime = tween._startTime + 0.0000000001, 
					overlaps = [], 
					oCount = 0, 
					globalStart;
				i = siblings.length;
				while (--i > -1) {
					if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
						//ignore
					} else if (curTween._timeline !== tween._timeline) {
						globalStart = globalStart || _checkOverlap(tween, 0);
						if (_checkOverlap(curTween, globalStart) === 0) {
							overlaps[oCount++] = curTween;
						}
					} else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale + 0.0000000001 > startTime) if (!((tween._duration === 0 || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
						overlaps[oCount++] = curTween;
					}
				}
				
				i = oCount;
				while (--i > -1) {
					curTween = overlaps[i];
					if (mode === 2) if (curTween._kill(props, target)) {
						changed = true;
					}
					if (mode !== 2 || (!curTween._firstPT && curTween._initted)) { 
						if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
							changed = true;
						}
					}
				}
				return changed;
			},
			
			_checkOverlap = function(tween, reference) {
				var tl = tween._timeline, 
					ts = tl._timeScale, 
					t = tween._startTime;
				while (tl._timeline) {
					t += tl._startTime;
					ts *= tl._timeScale;
					if (tl._paused) {
						return -100;
					}
					tl = tl._timeline;
				}
				t /= ts;
				return (t > reference) ? t - reference : (!tween._initted && t - reference < 0.0000000002) ? 0.0000000001 : ((t = t + tween.totalDuration() / tween._timeScale / ts + 0.0000000001) > reference) ? 0 : t - reference - 0.0000000001;
			};

	
//---- TweenLite instance methods -----------------------------------------------------------------------------

		p._init = function() {
			if (this.vars.startAt) {
				this.vars.startAt.overwrite = 0;
				this.vars.startAt.immediateRender = true;
				TweenLite.to(this.target, 0, this.vars.startAt);
			}
			var i, initPlugins, pt;
			if (this.vars.ease instanceof Ease) {
				this._ease = (this.vars.easeParams instanceof Array) ? this.vars.ease.config.apply(this.vars.ease, this.vars.easeParams) : this.vars.ease;
			} else if (typeof(this.vars.ease) === "function") {
				this._ease = new Ease(this.vars.ease, this.vars.easeParams);
			} else {
				this._ease = TweenLite.defaultEase;
			}
			this._easeType = this._ease._type;
			this._easePower = this._ease._power;
			this._firstPT = null;
			
			if (this._targets) {
				i = this._targets.length;
				while (--i > -1) {
					if ( this._initProps( this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (this._overwrittenProps ? this._overwrittenProps[i] : null)) ) {
						initPlugins = true;
					}
				}
			} else {
				initPlugins = this._initProps(this.target, this._propLookup, this._siblings, this._overwrittenProps);
			}
			
			if (initPlugins) {
				TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
			}
			if (this._overwrittenProps) if (this._firstPT == null) if (typeof(this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
				this._enabled(false, false);
			}
			if (this.vars.runBackwards) {
				pt = this._firstPT;
				while (pt) {
					pt.s += pt.c;
					pt.c = -pt.c;
					pt = pt._next;
				}
			}
			this._onUpdate = this.vars.onUpdate;
			this._initted = true;
		};
		
		p._initProps = function(target, propLookup, siblings, overwrittenProps) {
			var p, i, initPlugins, plugin, a;
			if (target == null) {
				return false;
			}
			for (p in this.vars) {
				if (_reservedProps[p]) { 
					if (p === "onStartParams" || p === "onUpdateParams" || p === "onCompleteParams" || p === "onReverseCompleteParams" || p === "onRepeatParams") if ((a = this.vars[p])) {
						i = a.length;
						while (--i > -1) {
							if (a[i] === "{self}") {
								a = this.vars[p] = a.concat(); //copy the array in case the user referenced the same array in multiple tweens/timelines (each {self} should be unique)
								a[i] = this;
							}
						}
					}
					
				} else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this)) {
					
					//t - target 		[object]
					//p - property 		[string]
					//s - start			[number]
					//c - change		[number]
					//f - isFunction	[boolean]
					//n - name			[string]
					//pg - isPlugin 	[boolean]
					//pr - priority		[number]
					this._firstPT = {_next:this._firstPT, t:plugin, p:"setRatio", s:0, c:1, f:true, n:p, pg:true, pr:plugin._priority};
					i = plugin._overwriteProps.length;
					while (--i > -1) {
						propLookup[plugin._overwriteProps[i]] = this._firstPT;
					}
					if (plugin._priority || plugin._onInitAllProps) {
						initPlugins = true;
					}
					if (plugin._onDisable || plugin._onEnable) {
						this._notifyPluginsOfEnabled = true;
					}
					
				} else {
					this._firstPT = propLookup[p] = {_next:this._firstPT, t:target, p:p, f:(typeof(target[p]) === "function"), n:p, pg:false, pr:0};
					this._firstPT.s = (!this._firstPT.f) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
					this._firstPT.c = (typeof(this.vars[p]) === "number") ? this.vars[p] - this._firstPT.s : (typeof(this.vars[p]) === "string") ? parseFloat(this.vars[p].split("=").join("")) : 0;
				}
				if (this._firstPT) if (this._firstPT._next) {
					this._firstPT._next._prev = this._firstPT;
				}
			}
			
			if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
				return this._initProps(target, propLookup, siblings, overwrittenProps);
			}
			if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
				this._kill(propLookup, target);
				return this._initProps(target, propLookup, siblings, overwrittenProps);
			}
			return initPlugins;
		};
		
		p.render = function(time, suppressEvents, force) {
			var prevTime = this._time,
				isComplete, callback, pt;
			if (time >= this._duration) {
				this._totalTime = this._time = this._duration;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				if (!this._reversed) {
					isComplete = true;
					callback = "onComplete";
				}
				if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (time === 0 || this._rawPrevTime < 0) if (this._rawPrevTime !== time) {
						force = true;
					}
					this._rawPrevTime = time;
				}
				
			} else if (time <= 0) {
				this._totalTime = this._time = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._duration === 0) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (this._rawPrevTime >= 0) {
							force = true;
						}
						this._rawPrevTime = time;
					}
				} else if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
				
			} else {
				this._totalTime = this._time = time;
				
				if (this._easeType) {
					var r = time / this._duration, type = this._easeType, pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}
					
					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (time / this._duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}
					
				} else {
					this.ratio = this._ease.getRatio(time / this._duration);
				}
				
			}
			
			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._init();
				if (!isComplete && this._time) { //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
					this.ratio = this._ease.getRatio(this._time / this._duration);
				}
			}
			
			if (!this._active) if (!this._paused) {
				this._active = true;  //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0 || this._duration === 0) if (!suppressEvents) {
				this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
			}
			
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}
			
			
			if (this._onUpdate) if (!suppressEvents) {
				this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
			}
			
			if (callback) if (!this._gc) { //check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents) if (this.vars[callback]) {
					this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
				}
			}
			
		};
		
		p._kill = function(vars, target) {
			if (vars === "all") {
				vars = null;
			}
			if (vars == null) if (target == null || target == this.target) {
				return this._enabled(false, false);
			}
			target = target || this._targets || this.target;
			var i, overwrittenProps, p, pt, propLookup, changed, killProps, record;
			if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") { 
				i = target.length;
				while (--i > -1) {
					if (this._kill(vars, target[i])) {
						changed = true;
					}
				}
			} else {
				if (this._targets) {
					i = this._targets.length;
					while (--i > -1) {
						if (target === this._targets[i]) {
							propLookup = this._propLookup[i] || {};
							this._overwrittenProps = this._overwrittenProps || [];
							overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
							break;
						}
					}
				} else if (target !== this.target) {
					return false;
				} else {
					propLookup = this._propLookup;
					overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
				}

				if (propLookup) {
					killProps = vars || propLookup;
					record = (vars != overwrittenProps && overwrittenProps != "all" && vars != propLookup && (vars == null || vars._tempKill != true)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
					for (p in killProps) {
						if ((pt = propLookup[p])) {
							if (pt.pg && pt.t._kill(killProps)) {
								changed = true; //some plugins need to be notified so they can perform cleanup tasks first
							}
							if (!pt.pg || pt.t._overwriteProps.length === 0) {
								if (pt._prev) {
									pt._prev._next = pt._next;
								} else if (pt === this._firstPT) {
									this._firstPT = pt._next;
								}
								if (pt._next) {
									pt._next._prev = pt._prev;
								}
								pt._next = pt._prev = null;
							}
							delete propLookup[p];
						}
						if (record) { 
							overwrittenProps[p] = 1;
						}
					}
				}
			}
			return changed;
		};
	
		p.invalidate = function() {
			if (this._notifyPluginsOfEnabled) {
				TweenLite._onPluginEvent("_onDisable", this);
			}
			this._firstPT = null;
			this._overwrittenProps = null;
			this._onUpdate = null;
			this._initted = this._active = this._notifyPluginsOfEnabled = false;
			this._propLookup = (this._targets) ? {} : [];
			return this;
		};
		
		p._enabled = function(enabled, ignoreTimeline) {
			if (enabled && this._gc) {
				if (this._targets) {
					var i = this._targets.length;
					while (--i > -1) {
						this._siblings[i] = _register(this._targets[i], this, true);
					}
				} else {
					this._siblings = _register(this.target, this, true);
				}
			}
			Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
			if (this._notifyPluginsOfEnabled) if (this._firstPT) {
				return TweenLite._onPluginEvent(((enabled) ? "_onEnable" : "_onDisable"), this);
			}
			return false;
		};
	
	
//----TweenLite static methods -----------------------------------------------------
		
		TweenLite.to = function(target, duration, vars) {
			return new TweenLite(target, duration, vars);
		};
		
		TweenLite.from = function(target, duration, vars) {
			vars.runBackwards = true;
			if (vars.immediateRender != false) {
				vars.immediateRender = true;
			}
			return new TweenLite(target, duration, vars);
		};
		
		TweenLite.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			if (fromVars.immediateRender) {
				toVars.immediateRender = true;
			}
			return new TweenLite(target, duration, toVars);
		};
		
		TweenLite.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenLite(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, onCompleteScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, onReverseCompleteScope:scope, immediateRender:false, useFrames:useFrames, overwrite:0});
		};
		
		TweenLite.set = function(target, vars) {
			return new TweenLite(target, 0, vars);
		};
		
		TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function(target, vars) {
			var a = TweenLite.getTweensOf(target), 
				i = a.length;
			while (--i > -1) {
				a[i]._kill(vars, target);
			}
		};
		
		TweenLite.getTweensOf = function(target) {
			if (target == null) { return; }
			var i, a, j, t;
			if ((target instanceof Array || target.jquery) && typeof(target[0]) === "object") { 
				i = target.length;
				a = [];
				while (--i > -1) {
					a = a.concat(TweenLite.getTweensOf(target[i]));
				}
				i = a.length;
				//now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
				while (--i > -1) {
					t = a[i];
					j = i;
					while (--j > -1) {
						if (t === a[j]) {
							a.splice(i, 1);
						}
					}
				}
			} else {
				a = _register(target).concat();
				i = a.length;
				while (--i > -1) {
					if (a[i]._gc) {
						a.splice(i, 1);
					}
				}
			}
			return a;
		};
		
		
		
/*
 * ----------------------------------------------------------------
 * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another <script> call before loading plugins which is easy to forget)
 * ----------------------------------------------------------------
 */
		var TweenPlugin = _class("plugins.TweenPlugin", function(props, priority) {
					this._overwriteProps = (props || "").split(",");
					this._propName = this._overwriteProps[0];
					this._priority = priority || 0;
				}, true);
		
		p = TweenPlugin.prototype;
		TweenPlugin.version = 12;
		TweenPlugin.API = 2;
		p._firstPT = null;		
			
		p._addTween = function(target, prop, start, end, overwriteProp, round) {
			if (end != null && (c = (typeof(end) === "number" || end.indexOf("=") === -1) ? Number(end) - start : Number(end.split("=").join("")))) {
				this._firstPT = {_next:this._firstPT, t:target, p:prop, s:start, c:c, f:(typeof(target[prop]) == "function"), n:overwriteProp || prop, r:round};
				if (this._firstPT._next) {
					this._firstPT._next._prev = this._firstPT;
				}
			}
		}
			
		p.setRatio = function(v) {
			var pt = this._firstPT, 
				val;
			while (pt) {
				val = pt.c * v + pt.s;
				if (pt.r) {
					val = (val + ((val > 0) ? 0.5 : -0.5)) >> 0; //about 4x faster than Math.round()
				}
				if (pt.f) {
					pt.t[pt.p](val);
				} else {
					pt.t[pt.p] = val;
				}
				pt = pt._next;
			}
		}
			
		p._kill = function(lookup) {
			if (lookup[this._propName] != null) {
				this._overwriteProps = [];
			} else {
				var i = this._overwriteProps.length;
				while (--i > -1) {
					if (lookup[this._overwriteProps[i]] != null) {
						this._overwriteProps.splice(i, 1);
					}
				}
			}
			var pt = this._firstPT;
			while (pt) {
				if (lookup[pt.n] != null) {
					if (pt._next) {
						pt._next._prev = pt._prev;
					}
					if (pt._prev) {
						pt._prev._next = pt._next;
						pt._prev = null;
					} else if (this._firstPT === pt) {
						this._firstPT = pt._next;
					}
				}
				pt = pt._next;
			}
			return false;
		}
			
		p._roundProps = function(lookup, value) {
			var pt = this._firstPT;
			while (pt) {
				if (lookup[this._propName] || (pt.n != null && lookup[ pt.n.split(this._propName + "_").join("") ])) { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
					pt.r = value;
				}
				pt = pt._next;
			}
		}
		
		TweenLite._onPluginEvent = function(type, tween) {
			var pt = tween._firstPT, 
				changed;
			if (type === "_onInitAllProps") {
				//sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
				var pt2, first, last, next;
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				pt = tween._firstPT = first;
			}
			while (pt) {
				if (pt.pg) if (typeof(pt.t[type]) === "function") if (pt.t[type]()) {
					changed = true;
				}
				pt = pt._next;
			}
			return changed;
		}
		
		TweenPlugin.activate = function(plugins) {
			var i = plugins.length;
			while (--i > -1) {
				if (plugins[i].API === TweenPlugin.API) {
					TweenLite._plugins[(new plugins[i]())._propName] = plugins[i];
				}
			}
			return true;
		}
		
		
		
		//now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you. 
		if ((a = window._gsQueue)) {
			for (i = 0; i < a.length; i++) {
				a[i]();
			}
			for (p in _classLookup) {
				if (!_classLookup[p].def) {
					console.log("Warning: TweenLite encountered missing dependency: com.greensock."+p);
				}
			}
		}
		
	
})(window);