package com.taskflow.modules.admin.seed;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/seed")
public class AdminSeedController {

    private final AvendumSeeder seeder;

    public AdminSeedController(AvendumSeeder seeder) {
        this.seeder = seeder;
    }

    @PostMapping("/avendum")
    public ResponseEntity<String> seedAvendum() {
        seeder.seedAvendum();
        return ResponseEntity.ok("Avendum seed executed");
    }
}
