import React from 'react';
import styles from './Features.module.css';
import {features} from '@/constants/feature'

const Features = () => {
  return (
    <div className={styles.wrapper}>
      {features.map((feature, index) => (
        <div className={`${styles.outer} gap-44`} key={index}>
          <div className={styles.dot} />
          <div className={styles.card}>
            <div className={styles.ray} />
            <div className="text-2xl text-center">{feature.title}</div>
            <div className="text-[13px] mb-6 pl-10 pr-10 text-center">{feature.description}</div>
            <div className={`${styles.line} ${styles.topl}`} />
            <div className={`${styles.line} ${styles.leftl}`} />
            <div className={`${styles.line} ${styles.bottoml}`} />
            <div className={`${styles.line} ${styles.rightl}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Features