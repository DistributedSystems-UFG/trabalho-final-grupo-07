FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/user-service-*.jar app.jar
EXPOSE 9091
ENTRYPOINT ["java", "-jar", "/app/app.jar"]