#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Executes all testing categories for Dating Profile Optimizer and LinkedIn Headshot Generator
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const execCommand = (command, description) => {
  log(`\n${colors.blue}${colors.bold}Running: ${description}${colors.reset}`);
  log(`Command: ${command}`);
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log(`${colors.green}✅ ${description} - PASSED${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description} - FAILED${colors.reset}`);
    log(`Error: ${error.message}`);
    return false;
  }
};

const generateTestReport = (results) => {
  const reportPath = path.join(__dirname, 'reports', 'test-execution-summary.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => r.passed === false).length,
    results: results
  };

  try {
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`${colors.blue}📊 Test report generated: ${reportPath}${colors.reset}`);
  } catch (error) {
    log(`${colors.yellow}⚠️  Could not generate test report: ${error.message}${colors.reset}`);
  }

  return reportData;
};

const main = async () => {
  log(`${colors.bold}${colors.blue}🚀 Starting Comprehensive QA Testing Suite${colors.reset}`);
  log(`${colors.bold}Applications: Dating Profile Optimizer & LinkedIn Headshot Generator${colors.reset}\n`);

  const testSuites = [
    {
      name: 'Code Quality & Linting',
      command: 'npm run lint',
      description: 'ESLint code quality checks'
    },
    {
      name: 'Security Linting',
      command: 'npm run lint:security',
      description: 'Security-focused code analysis'
    },
    {
      name: 'Unit Tests',
      command: 'npm run test:ci',
      description: 'Unit tests with coverage'
    },
    {
      name: 'Security Tests',
      command: 'npm run test:security',
      description: 'Security and authentication tests'
    },
    {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      description: 'Performance benchmarking tests'
    },
    {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      description: 'API and service integration tests'
    },
    {
      name: 'Dependency Audit',
      command: 'npm run audit:dependencies',
      description: 'NPM dependency vulnerability audit'
    }
  ];

  const results = [];
  let overallSuccess = true;

  for (const suite of testSuites) {
    const passed = execCommand(suite.command, suite.description);
    results.push({
      name: suite.name,
      command: suite.command,
      passed: passed,
      timestamp: new Date().toISOString()
    });
    
    if (!passed) {
      overallSuccess = false;
    }
  }

  // Generate test report
  const report = generateTestReport(results);

  // Print summary
  log(`\n${colors.bold}${colors.blue}📋 TEST EXECUTION SUMMARY${colors.reset}`);
  log(`${colors.bold}==============================${colors.reset}`);
  log(`Total Test Suites: ${report.totalTests}`);
  log(`${colors.green}Passed: ${report.passed}${colors.reset}`);
  log(`${colors.red}Failed: ${report.failed}${colors.reset}`);
  log(`Success Rate: ${Math.round((report.passed / report.totalTests) * 100)}%`);

  if (overallSuccess) {
    log(`\n${colors.green}${colors.bold}🎉 ALL TESTS PASSED - READY FOR RELEASE!${colors.reset}`);
    log(`${colors.green}Applications are production-ready for app store submission.${colors.reset}`);
    process.exit(0);
  } else {
    log(`\n${colors.red}${colors.bold}❌ SOME TESTS FAILED - RELEASE BLOCKED${colors.reset}`);
    log(`${colors.red}Please resolve failing tests before proceeding with release.${colors.reset}`);
    
    // Show which tests failed
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      log(`\n${colors.red}Failed Test Suites:${colors.reset}`);
      failedTests.forEach(test => {
        log(`${colors.red}  • ${test.name}${colors.reset}`);
      });
    }
    
    process.exit(1);
  }
};

// Handle script arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log(`${colors.bold}Comprehensive Test Suite Runner${colors.reset}`);
  log('Executes all testing categories for production readiness assessment\n');
  log('Usage: node run-comprehensive-tests.js [options]\n');
  log('Options:');
  log('  --help, -h     Show this help message');
  log('  --verbose, -v  Enable verbose output');
  log('  --ci          Run in CI mode (non-interactive)');
  process.exit(0);
}

// Set environment variables based on arguments
if (args.includes('--ci')) {
  process.env.CI = 'true';
}

if (args.includes('--verbose') || args.includes('-v')) {
  process.env.VERBOSE = 'true';
}

// Execute main function
main().catch((error) => {
  log(`${colors.red}${colors.bold}💥 Unexpected error occurred:${colors.reset}`);
  console.error(error);
  process.exit(1);
});