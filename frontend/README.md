# TVA Frontend
## Introduction
The TVA Security System, proposed by Boston University's CASP Lab, is an advanced multi-party computation system specifically designed for secure and expressive time series analytics. Its core strength lies in providing robust security guarantees for time series data, making it an ideal choice for handling sensitive information. For instance, TVA can securely analyze patient data from hospitals, preserving the privacy of patients while offering valuable insights to medical professionals.

The aim of this project is to develop the frontend for TVA, making it more user-friendly, especially for those without a computer science background, such as doctors and patients. The primary functionalities and goals include:
- Task Customization: Users should be able to easily define and submit analysis tasks they wish to execute.
- Data Schema Management: Data owners have the ability to define their own data schemas. However, for data analysts to analyze this data, they must first obtain permission from the data owner.
- Task Progress Tracking: After data analysts dispatch tasks, they should be able to monitor the progress of those tasks in real-time.
- Result Presentation: Once data processing is complete, users should be able to access the results in an easy-to-understand format.

## How to Run
```bash
cd tva_frontend
npm install
npm run dev
```

## Contributors
John Liagouris, liagos@bu.edu

Vasiliki Kalavri, vkalavri@bu.edu

Ethan Seow,eseow@bu.edu

Yan Tong, yantong@bu.edu
