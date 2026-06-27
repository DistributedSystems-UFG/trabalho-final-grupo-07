package com.trivia.user.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;

@Component
public class DebugPropertiesPrinter implements CommandLineRunner {

    private final ApplicationContext context;

    public DebugPropertiesPrinter(ApplicationContext context) {
        this.context = context;
    }

    @Override
    public void run(String... args) {
        Map<String, DataSource> dataSourceBeans = context.getBeansOfType(DataSource.class);
        System.out.println("=== DEBUG total DataSource beans found: " + dataSourceBeans.size());
        for (Map.Entry<String, DataSource> entry : dataSourceBeans.entrySet()) {
            String beanName = entry.getKey();
            DataSource ds = entry.getValue();
            String urlInfo = (ds instanceof HikariDataSource hikari) ? hikari.getJdbcUrl() : "non-Hikari: " + ds.getClass();
            System.out.println("=== DEBUG bean name=[" + beanName + "] type=[" + ds.getClass().getSimpleName() + "] jdbcUrl=[" + urlInfo + "]");
        }
    }
}