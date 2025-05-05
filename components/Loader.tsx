import React from 'react';
import styles from './Loader.module.css';

const Loader = () => {
  return (
    <div>
      <div className={styles.spinner}>
        <div className={styles.spinner1} />
      </div>
    </div>
  );
}

export default Loader;
