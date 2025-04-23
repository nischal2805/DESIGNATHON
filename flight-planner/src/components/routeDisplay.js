import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const RouteDisplay = ({ airports }) => {
    return (
        <div className="route-display">
            {airports.map((airport, index) => (
                <motion.div
                    key={airport}
                    className="airport-chip"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                    {airport}
                    {index < airports.length - 1 && (
                        <motion.div
                            className="route-arrow"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.15 }}
                        >
                            <i className="fas fa-arrow-right"></i>
                        </motion.div>
                    )}
                </motion.div>
            ))}
        </div>
    );
};

RouteDisplay.propTypes = {
    airports: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default RouteDisplay;