# Laboratory Management System
This is a simple laboratory management system created as a group project for the course [Praxis der Softwareentwicklung](https://pp.ipd.kit.edu/lehre/WS202122/pse/) at the Karlsruher Institut für Technologie (KIT) and the Institute for Technology of Persuasive Computing (TECO).

## System Overview
The system is a web application that allows the management of laboratory equipment. It is based on a RESTful API that is used to communicate with the different microservices.

### System Architecture
The system is based on a microservice architecture. The microservices are:
- [`Frontend`](https://github.com/zoemartin01/LMS-Frontend): The frontend of the application built with Angular.
- [`Backend`](https://github.com/zoemartin01/LMS-Backend): The main backend of the application built with Node.js and Express.
- [`Camera`](https://github.com/zoemartin01/LMS-Camera): A small service that handles recording and live streaming for a webcam.

## Features
- User management and authentication
- Room management and booking
- Inventory management and lending
- Camera streaming and recording for 3D-printing

## Development
This project was developed by Adrian Keller, Mario Lehnerer, Zoe Martin, Sarah Raab und Lena Richau.
