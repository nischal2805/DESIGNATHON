const animations = {
    fadeIn: function(element, duration = 400) {
        element.style.opacity = 0;
        element.style.display = 'block';
        let start = null;

        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.min(progress / duration, 1);
            if (progress < duration) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    },

    fadeOut: function(element, duration = 400) {
        element.style.opacity = 1;
        let start = null;

        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.max(1 - progress / duration, 0);
            if (progress < duration) {
                requestAnimationFrame(step);
            } else {
                element.style.display = 'none';
            }
        };

        requestAnimationFrame(step);
    },

    slideIn: function(element, duration = 400) {
        element.style.transform = 'translateY(-20px)';
        element.style.opacity = 0;
        element.style.display = 'block';
        let start = null;

        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const easing = Math.min(progress / duration, 1);
            element.style.transform = `translateY(${(1 - easing) * -20}px)`;
            element.style.opacity = easing;
            if (progress < duration) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    },

    slideOut: function(element, duration = 400) {
        element.style.transform = 'translateY(0)';
        element.style.opacity = 1;
        let start = null;

        const step = timestamp => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const easing = Math.min(progress / duration, 1);
            element.style.transform = `translateY(${easing * 20}px)`;
            element.style.opacity = 1 - easing;
            if (progress < duration) {
                requestAnimationFrame(step);
            } else {
                element.style.display = 'none';
            }
        };

        requestAnimationFrame(step);
    }
};

export default animations;